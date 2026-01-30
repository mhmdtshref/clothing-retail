export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { connectToDB } from '@/lib/mongoose';
import Receipt from '@/models/receipt';
import { getDeliveryStatus } from '@/lib/deliveries';
import { computeReceiptTotals } from '@/lib/pricing';
import { assertStatusTransition } from '@/lib/receipt-guards';

export async function GET(req) {
  const url = new URL(req.url);
  const secret = url.searchParams.get('secret') || '';
  const expected = process.env.DELIVERY_CRON_SECRET || '';
  if (!expected || secret !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectToDB();
    const now = new Date();
    const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

    const candidates = await Receipt.find({
      type: { $in: ['sale', 'sale_return'] },
      'delivery.company': { $exists: true },
      status: { $in: ['ordered', 'on_delivery', 'payment_collected', 'ready_to_receive'] },
      $or: [
        { 'delivery.nextSyncAt': { $lte: now } },
        { 'delivery.nextSyncAt': { $exists: false } },
      ],
    })
      .limit(50)
      .exec();

    let updated = 0;
    const errors = [];

    for (const doc of candidates) {
      try {
        const company = doc?.delivery?.company;
        const externalId = doc?.delivery?.externalId;
        if (!company || !externalId) continue;

        const stat = await getDeliveryStatus({ company, externalId });

        doc.delivery.status = stat?.providerStatus || doc.delivery.status || '';
        if (stat?.trackingNumber) doc.delivery.trackingNumber = stat.trackingNumber;
        if (stat?.trackingUrl) doc.delivery.trackingUrl = stat.trackingUrl;
        const historyEntry = { at: now, code: 'sync', raw: stat };
        doc.delivery.history = Array.isArray(doc.delivery.history)
          ? [...doc.delivery.history, historyEntry]
          : [historyEntry];

        doc.delivery.lastSyncAt = now;
        doc.delivery.nextSyncAt = new Date(now.getTime() + SIX_HOURS_MS);

        const next = stat?.internal;
        if (next && next !== doc.status) {
          // If moving to payment_collected, auto-add remaining due as COD payment
          if (doc.type === 'sale' && next === 'payment_collected') {
            const { totals } = computeReceiptTotals(doc.toObject ? doc.toObject() : doc);
            const paidSoFar = Array.isArray(doc.payments)
              ? doc.payments.reduce((acc, p) => acc + Number(p?.amount || 0), 0)
              : 0;
            const dueBefore = Math.max(0, Number(totals?.grandTotal || 0) - paidSoFar);
            if (dueBefore > 0) {
              doc.payments = Array.isArray(doc.payments) ? doc.payments : [];
              doc.payments.push({
                amount: dueBefore,
                method: 'cod',
                note: 'COD auto-sync',
                at: now,
              });
            }
          }

          try {
            assertStatusTransition(doc.status, next);
            doc.status = next;
          } catch (_e) {
            // ignore invalid transitions silently for now
          }
        }

        await doc.save();
        updated += 1;
      } catch (e) {
        errors.push({ id: String(doc?._id || ''), message: e?.message || String(e) });
      }
    }

    return NextResponse.json({ ok: true, updated, errors });
  } catch (err) {
    return NextResponse.json(
      { error: 'InternalServerError', message: err?.message || String(err) },
      { status: 500 },
    );
  }
}
