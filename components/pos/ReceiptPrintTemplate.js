'use client';

import * as React from 'react';
import POS_RECEIPT from '@/config/pos-receipt';
import { useI18n } from '@/components/i18n/useI18n';

export default function ReceiptPrintTemplate({ receipt, totals, autoPrint = false }) {
  const { t, formatNumber, formatDate } = useI18n();
  const isReturn = receipt?.type === 'sale_return';
  const isSale = receipt?.type === 'sale';
  const isDelivery = Boolean(receipt?.delivery?.company);
  const deliveryCompanyKey = String(receipt?.delivery?.company || '').toLowerCase();
  const deliveryCompanyName =
    deliveryCompanyKey === 'optimus'
      ? t('delivery.company.optimus')
      : deliveryCompanyKey === 'sabeq_laheq'
        ? t('delivery.company.sabeq_laheq')
        : receipt?.delivery?.company || '';
  const currency = (n) =>
    formatNumber(Number(n || 0), { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
      <style>{`
        @media print {
          @page { size: 80mm auto; margin: 0; }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: 80mm;
            /* Avoid CSS-level clipping; rely on the receipt box width + wrapping. */
            overflow: visible !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          /* Print only the receipt content */
          body * { visibility: hidden !important; }
          .receipt-80mm, .receipt-80mm * { visibility: visible !important; }
          /* Some printers/drivers still add a non-printable margin; keep content slightly inset. */
          .receipt-80mm {
            position: absolute;
            left: 0;
            top: 0;
            margin: 0;
          }
        }
        .receipt-80mm {
          box-sizing: border-box;
          /*
            OCOM OCPP-80K-URL (and many 80mm drivers) have ~72mm printable width.
            Use a <=72mm box to prevent right-edge clipping.
          */
          width: 72mm;
          max-width: 72mm;
          padding: 4px 4px 10px;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono',
            'Courier New', monospace;
          font-size: 14px;
          font-weight: 600;
          line-height: 1.25;
          color: #000;
        }
        .r-center { text-align: center; }
        .r-right { text-align: right; }
        .muted { color: #555; }
        .row { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
        .row > :first-child { flex: 1 1 auto; min-width: 0; overflow-wrap: anywhere; }
        .row > :last-child { flex: 0 0 auto; white-space: nowrap; }
        .sep { border-top: 1px dashed #000; margin: 6px 0; }
        table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        th, td { padding: 2px 2px; overflow-wrap: anywhere; word-break: break-word; }
        /* Rebalance widths so Arabic headers don't collide (Qty was too narrow). */
        th:first-child, td:first-child { width: 40%; }
        th:nth-child(2), td:nth-child(2) { width: 20%; }
        th:nth-child(3), td:nth-child(3) { width: 20%; }
        th:nth-child(4), td:nth-child(4) { width: 20%; }
        th.r { text-align: right; white-space: normal; }
        td.r {
          text-align: right;
          white-space: nowrap;
          /* Keep numbers readable in RTL (minus sign, decimals). */
          direction: ltr;
          unicode-bidi: isolate;
          font-variant-numeric: tabular-nums;
        }
        .num {
          direction: ltr;
          unicode-bidi: isolate;
          font-variant-numeric: tabular-nums;
          white-space: nowrap;
        }
        thead th { font-size: 13px; line-height: 1.15; }
        th { font-weight: 800; }
        .title { font-weight: 800; }
        .row.title { font-weight: 800; font-size: 15px; }
      `}</style>

      <div className="r-center">
        <div className="title">{POS_RECEIPT.shopName}</div>
        <div>{POS_RECEIPT.addressLine1}</div>
        <div>{POS_RECEIPT.addressLine2}</div>
        <div>{POS_RECEIPT.taxId}</div>
      </div>

      <div className="sep" />

      <div className="row">
        <div>
          {isReturn
            ? t('receipt.return')
            : isSale
              ? t('receipt.sale')
              : (receipt?.type || '').toUpperCase()}
        </div>
        <div>#{shortId}</div>
      </div>
      <div className="row">
        <div>{receipt?.date ? formatDate(new Date(receipt.date)) : ''}</div>
        <div className="muted">{t(`status.${receipt?.status}`)}</div>
      </div>
      {isSale && receipt?.customer && (
        <div className="row">
          <div className="muted">{t('pos.customer')}</div>
          <div>
            {receipt.customer.name || t('common.noName')} • {receipt.customer.phone}
          </div>
        </div>
      )}
      {receipt?.returnReason && (
        <div className="muted">
          {t('receipt.reason')}: {receipt.returnReason}
        </div>
      )}
      {isDelivery && (
        <div className="muted">
          {t('receipt.note')}: {t('receipt.deliveryNoteCOD')}
          {receipt?.note ? ` — ${receipt.note}` : ''}
        </div>
      )}
      {!isDelivery && receipt?.note && (
        <div className="muted">
          {t('receipt.note')}: {receipt.note}
        </div>
      )}

      <div className="sep" />

      <table>
        <thead>
          <tr>
            <th>{t('receipt.item')}</th>
            <th className="r">{t('receipt.qty')}</th>
            <th className="r">{t('receipt.unit')}</th>
            <th className="r">{t('receipt.net')}</th>
          </tr>
        </thead>
        <tbody>
          {(receipt?.items || []).map((it, idx) => {
            const s = it.snapshot || {};
            const q = Number(it.qty || 0);
            const unit = Number(it.unitPrice || it.unitCost || 0);
            const line = unit * q;
            const discAmt = it.discount
              ? it.discount.mode === 'percent'
                ? (line * Number(it.discount.value || 0)) / 100
                : Number(it.discount.value || 0)
              : 0;
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
      <div className="row">
        <div>{t('receipt.subtotal')}</div>
        <div className="num">{currency(totals?.itemSubtotal)}</div>
      </div>
      <div className="row">
        <div>{t('receipt.itemDiscounts')}</div>
        <div className="num">-{currency(totals?.itemDiscountTotal)}</div>
      </div>
      <div className="row">
        <div>{t('receipt.billDiscount')}</div>
        <div className="num">-{currency(totals?.billDiscountTotal)}</div>
      </div>
      <div className="row">
        <div>
          {t('receipt.tax')} ({Number(totals?.taxPercent || 0)}%)
        </div>
        <div className="num">{currency(totals?.taxTotal)}</div>
      </div>
      <div className="row title">
        <div>{t('receipt.grandTotal')}</div>
        <div className="num">{currency(totals?.grandTotal)}</div>
      </div>
      {isDelivery && (
        <>
          <div className="row">
            <div>{t('receipt.deliveryCompany')}</div>
            <div>{deliveryCompanyName}</div>
          </div>
          {deliveryFees > 0 && (
            <div className="row">
              <div>{t('receipt.deliveryFees')}</div>
              <div className="num">{currency(deliveryFees)}</div>
            </div>
          )}
          <div className="row title">
            <div>{t('receipt.codTotal')}</div>
            <div className="num">{currency(codTotal)}</div>
          </div>
        </>
      )}
      {(receipt?.status === 'pending' || Number(paidTotal) > 0) && (
        <>
          <div className="row">
            <div>{t('receipt.paid')}</div>
            <div className="num">{currency(paidTotal)}</div>
          </div>
          <div className="row">
            <div>{t('receipt.balance')}</div>
            <div className="num">{currency(dueTotal)}</div>
          </div>
        </>
      )}
      <div className="sep" />
      <div className="r-center">{POS_RECEIPT.footerNote}</div>
    </div>
  );
}
