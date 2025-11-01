export const runtime = 'nodejs';

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { connectToDB } from '@/lib/mongoose';
import Receipt from '@/models/receipt';
import Company from '@/models/company';
import { computeReceiptTotals } from '@/lib/pricing';
import ReceiptPrintTemplate from '@/components/pos/ReceiptPrintTemplate';

export default async function POSPrintPage({ params }) {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in?redirect_url=/pos');

  await connectToDB();
  const r = await Receipt.findById(params.id).lean();
  if (!r) {
    return (
      <html><body><p>Receipt not found</p></body></html>
    );
  }
  if (r.companyId) {
    const c = await Company.findById(r.companyId, { name: 1 }).lean();
    r.companyName = c?.name || '';
  }
  const { totals } = computeReceiptTotals(r);

  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Print #{String(r._id).slice(-6)}</title>
      </head>
      <body>
        <ReceiptPrintTemplate receipt={r} totals={totals} />
        <script dangerouslySetInnerHTML={{ __html: `window.addEventListener('load', () => { setTimeout(() => window.print(), 50); });` }} />
      </body>
    </html>
  );
}


