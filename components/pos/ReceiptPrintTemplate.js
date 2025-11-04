'use client';

import * as React from 'react';
import POS_RECEIPT from '@/config/pos-receipt';

export default function ReceiptPrintTemplate({ receipt, totals, autoPrint = false }) {
  const isReturn = receipt?.type === 'sale_return';
  const isSale = receipt?.type === 'sale';
  const isDelivery = Boolean(receipt?.delivery?.company);
  const deliveryCompanyKey = String(receipt?.delivery?.company || '').toLowerCase();
  const deliveryCompanyName = deliveryCompanyKey === 'optimus'
    ? 'Optimus'
    : deliveryCompanyKey === 'sabeq_laheq'
      ? 'Sabeq Laheq'
      : (receipt?.delivery?.company || '');
  const currency = (n) => Number(n || 0).toFixed(2);
  const shortId = String(receipt?._id || '').slice(-6);
  const paidTotal = Array.isArray(receipt?.payments)
    ? receipt.payments.reduce((acc, p) => acc + Number(p?.amount || 0), 0)
    : 0;
  const dueTotal = Math.max(0, Number(totals?.grandTotal || 0) - Number(paidTotal || 0));

  const providerCOD = Number(receipt?.delivery?.providerMeta?.codAmount || 0);
  const codTotal = isDelivery && providerCOD > 0 ? providerCOD : Number(totals?.grandTotal || 0);
  const deliveryFees = Math.max(0, codTotal - Number(totals?.grandTotal || 0));

  React.useEffect(() => {
    if (autoPrint && typeof window !== 'undefined') {
      const t = setTimeout(() => window.print(), 50);
      return () => clearTimeout(t);
    }
  }, [autoPrint]);

  return (
    <div className="receipt-80mm">
      <style jsx global>{`
        @media print {
          @page { size: 80mm auto; margin: 0; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        .receipt-80mm { width: 80mm; padding: 8px 8px 16px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; font-size: 12px; color: #000; }
        .r-center { text-align: center; }
        .r-right { text-align: right; }
        .muted { color: #555; }
        .row { display: flex; justify-content: space-between; align-items: baseline; }
        .sep { border-top: 1px dashed #000; margin: 6px 0; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 2px 0; }
        th.r, td.r { text-align: right; }
        .title { font-weight: 700; }
      `}</style>

      <div className="r-center">
        <div className="title">{POS_RECEIPT.shopName}</div>
        <div>{POS_RECEIPT.addressLine1}</div>
        <div>{POS_RECEIPT.addressLine2}</div>
        <div>{POS_RECEIPT.taxId}</div>
      </div>

      <div className="sep" />

      <div className="row">
        <div>{isReturn ? 'RETURN' : isSale ? 'SALE' : (receipt?.type || '').toUpperCase()}</div>
        <div>#{shortId}</div>
      </div>
      <div className="row">
        <div>{new Date(receipt?.date || Date.now()).toLocaleString()}</div>
        <div className="muted">{receipt?.status}</div>
      </div>
      {isSale && receipt?.customer && (
        <div className="row">
          <div className="muted">Customer</div>
          <div>{(receipt.customer.name || '(No name)')} • {receipt.customer.phone}</div>
        </div>
      )}
      {receipt?.returnReason && (
        <div className="muted">Reason: {receipt.returnReason}</div>
      )}
      {isDelivery && (
        <div className="muted">Note: Delivery (COD){receipt?.note ? ` — ${receipt.note}` : ''}</div>
      )}
      {!isDelivery && receipt?.note && (
        <div className="muted">Note: {receipt.note}</div>
      )}

      <div className="sep" />

      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th className="r">Qty</th>
            <th className="r">Unit</th>
            <th className="r">Net</th>
          </tr>
        </thead>
        <tbody>
          {(receipt?.items || []).map((it, idx) => {
            const s = it.snapshot || {}; const q = Number(it.qty || 0);
            const unit = Number(it.unitPrice || it.unitCost || 0);
            const line = unit * q;
            const discAmt = it.discount ? (it.discount.mode === 'percent' ? (line * Number(it.discount.value || 0) / 100) : Number(it.discount.value || 0)) : 0;
            const net = Math.max(0, line - discAmt);
            return (
              <tr key={idx}>
                <td>
                  <div className="title">{s.productCode || '-'}</div>
                  <div className="muted">{`${s.size || ''}/${s.color || ''}`}</div>
                </td>
                <td className="r">{q}</td>
                <td className="r">{currency(unit)}</td>
                <td className="r">{currency(net)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="sep" />
      <div className="row"><div>Item Subtotal</div><div>{currency(totals?.itemSubtotal)}</div></div>
      <div className="row"><div>Item Discounts</div><div>-{currency(totals?.itemDiscountTotal)}</div></div>
      <div className="row"><div>Bill Discount</div><div>-{currency(totals?.billDiscountTotal)}</div></div>
      <div className="row"><div>Tax ({Number(totals?.taxPercent || 0)}%)</div><div>{currency(totals?.taxTotal)}</div></div>
      <div className="row title"><div>GRAND TOTAL</div><div>{currency(totals?.grandTotal)}</div></div>
      {isDelivery && (
        <>
          <div className="row"><div>Delivery Company</div><div>{deliveryCompanyName}</div></div>
          {deliveryFees > 0 && (
            <div className="row"><div>Delivery Fees</div><div>{currency(deliveryFees)}</div></div>
          )}
          <div className="row title"><div>COD TOTAL</div><div>{currency(codTotal)}</div></div>
        </>
      )}
      {(receipt?.status === 'pending' || Number(paidTotal) > 0) && (
        <>
          <div className="row"><div>Paid</div><div>{currency(paidTotal)}</div></div>
          <div className="row"><div>Balance</div><div>{currency(dueTotal)}</div></div>
        </>
      )}
      <div className="sep" />
      <div className="r-center">{POS_RECEIPT.footerNote}</div>
    </div>
  );
}


