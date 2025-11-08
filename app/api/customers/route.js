export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { connectToDB } from '@/lib/mongoose';
import { fetchConsigneeByPhone } from '@/lib/deliveries/optimus';
import Customer from '@/models/customer';

function escapeRx(s = '') {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function normalizePhone(input) {
  return String(input || '').replace(/\D/g, '');
}

// GET /api/customers?q=
export async function GET(req) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const q = (url.searchParams.get('q') || '').trim();
  const digits = normalizePhone(q);

  try {
    await connectToDB();

    const or = [];
    if (q) or.push({ name: new RegExp(escapeRx(q), 'i') });
    if (digits) or.push({ phone: new RegExp(escapeRx(digits)) });

    const filter = or.length ? { $or: or } : {};
    const items = await Customer.find(filter, { name: 1, phone: 1 })
      .sort({ name: 1 })
      .limit(10)
      .lean()
      .exec();

    const results = items.map((c) => ({ _id: c._id, name: c.name || '', phone: c.phone }));

    // If exact 10-digit phone searched, get Optimus suggestions (multiple) and prepend to results
    if (digits && digits.length === 10) {
      try {
        const remoteList = await fetchConsigneeByPhone(digits);
        if (Array.isArray(remoteList) && remoteList.length) {
          for (const remote of remoteList) {
            const provider = {
              addressLine: remote.addressLine || undefined,
              cityId: remote.cityId || undefined,
              cityName: remote.cityName || undefined,
              areaId: remote.areaId || undefined,
              areaName: remote.areaName || undefined,
            };
            results.unshift({ _id: undefined, name: remote.name || '', phone: remote.phone, provider });
          }
        }
      } catch (_e) {
        // ignore Optimus errors for search
      }
    }

    return NextResponse.json({ ok: true, items: results });
  } catch (err) {
    return NextResponse.json(
      { error: 'InternalServerError', message: err?.message || String(err) },
      { status: 500 },
    );
  }
}

const CreateSchema = z.object({
  name: z.string().trim().max(100).optional().default(''),
  phone: z.string().min(5).max(20),
});

// POST /api/customers  { name, phone }
export async function POST(req) {
  let lastPhone = '';
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'ValidationError', issues: z.treeifyError(parsed.error) },
        { status: 400 },
      );
    }

    const name = parsed.data.name || '';
    const phone = normalizePhone(parsed.data.phone);
    lastPhone = phone;
    if (!phone) {
      return NextResponse.json(
        { error: 'ValidationError', message: 'Invalid phone' },
        { status: 400 },
      );
    }

    await connectToDB();

    const existing = await Customer.findOne({ phone }, { name: 1, phone: 1 }).lean().exec();
    if (existing) {
      return NextResponse.json({ ok: true, customer: { _id: existing._id, name: existing.name || '', phone: existing.phone } }, { status: 200 });
    }

    const doc = await Customer.create({ name, phone });
    return NextResponse.json(
      { ok: true, customer: { _id: doc._id, name: doc.name || '', phone: doc.phone } },
      { status: 201 },
    );
  } catch (err) {
    if (err?.code === 11000) {
      // Unique conflict on phone: return existing as OK
      const phone = lastPhone;
      const c = phone ? await Customer.findOne({ phone }, { name: 1, phone: 1 }).lean().exec().catch(() => null) : null;
      if (c) return NextResponse.json({ ok: true, customer: { _id: c._id, name: c.name || '', phone: c.phone } }, { status: 200 });
      return NextResponse.json({ error: 'Conflict', message: 'Phone already exists' }, { status: 409 });
    }
    return NextResponse.json(
      { error: 'InternalServerError', message: err?.message || String(err) },
      { status: 500 },
    );
  }
}


