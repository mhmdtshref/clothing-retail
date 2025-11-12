'use client';

import * as React from 'react';
import { Box, Stack, Typography, Button, Divider, Table, TableHead, TableRow, TableCell, TableBody } from '@mui/material';
import { useI18n } from '@/components/i18n/useI18n';

export default function CheckoutSuccess({ receipt, totals, paidTotal, dueTotal, onNewSale }) {
  const { t, formatNumber, formatDate } = useI18n();
  const printRef = React.useRef(null);
  const onPrint = () => {
    if (!receipt?._id) return;
    const w = window.open(`/pos/print/${receipt._id}`, '_blank', 'noopener,noreferrer');
    if (w) w.focus();
  };
  const isReturn = receipt?.type === 'sale_return';
  const isPending = receipt?.status === 'pending';
  const computedPaid = Number(
    Number.isFinite(Number(paidTotal))
      ? Number(paidTotal)
      : Array.isArray(receipt?.payments)
        ? receipt.payments.reduce((acc, p) => acc + Number(p?.amount || 0), 0)
        : 0,
  );
  const computedDue = Number(
    Number.isFinite(Number(dueTotal))
      ? Number(dueTotal)
      : Math.max(0, Number(totals?.grandTotal || 0) - Number(computedPaid || 0)),
  );
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="h6">{isReturn ? t('pos.returnCompleted') : (isPending ? t('pos.salePending') : t('pos.saleCompleted'))}</Typography>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={onPrint}>{t('common.print')}</Button>
          <Button variant="contained" onClick={onNewSale}>{t('pos.newSale')}</Button>
        </Stack>
      </Stack>
      <Divider sx={{ mb: 2 }} />
      <Box ref={printRef} sx={{ bgColor: 'white' }}>
        <Typography variant="subtitle2" color="text.secondary">{isReturn ? t('receipt.return') : t('pos.receipt')} #{String(receipt?._id || '').slice(-6)}</Typography>
        <Typography variant="body2">{t('common.date')}: {formatDate(new Date(receipt?.date || Date.now()))}</Typography>
        <Divider sx={{ my: 1 }} />
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t('receipt.item')}</TableCell>
              <TableCell>{t('common.variant')}</TableCell>
              <TableCell align="right">{t('receipt.qty')}</TableCell>
              <TableCell align="right">{t('receipt.unit')}</TableCell>
              <TableCell align="right">{t('common.discount')}</TableCell>
              <TableCell align="right">{t('receipt.net')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(receipt?.items || []).map((it, idx) => {
              const s = it.snapshot || {};
              const unit = Number(it.unitPrice || 0);
              const q = Number(it.qty || 0);
              const line = unit * q;
              const d = it.discount ? (it.discount.mode === 'percent' ? `${it.discount.value}%` : it.discount.value) : 0;
              const discAmt = it.discount ? (it.discount.mode === 'percent' ? (line * Number(it.discount.value || 0) / 100) : Number(it.discount.value || 0)) : 0;
              const net = Math.max(0, line - discAmt);
              return (
                <TableRow key={idx}>
                  <TableCell>{s.productCode || '-'}</TableCell>
                  <TableCell>{`${s.size || ''} / ${s.color || ''}`}</TableCell>
                  <TableCell align="right">{formatNumber(q)}</TableCell>
                  <TableCell align="right">{formatNumber(unit, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                  <TableCell align="right">{typeof d === 'string' ? d : formatNumber(Number(d), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                  <TableCell align="right">{formatNumber(net, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <Divider sx={{ my: 1 }} />
        <Stack alignItems="flex-end" spacing={0.5}>
          <Typography>{t('receipt.subtotal')}: {formatNumber(Number(totals?.itemSubtotal || 0), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
          <Typography>{t('receipt.itemDiscounts')}: -{formatNumber(Number(totals?.itemDiscountTotal || 0), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
          <Typography>{t('receipt.billDiscount')}: -{formatNumber(Number(totals?.billDiscountTotal || 0), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
          <Typography>{t('receipt.tax')} ({formatNumber(Number(totals?.taxPercent || 0))}%): {formatNumber(Number(totals?.taxTotal || 0), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
          <Typography variant="h6">{t('receipt.grandTotal')}: {formatNumber(Number(totals?.grandTotal || 0), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
          {(isPending || computedPaid > 0) && (
            <>
              <Typography>{t('receipt.paid')}: {formatNumber(Number(computedPaid || 0), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
              <Typography>{t('receipt.balance')}: {formatNumber(Number(computedDue || 0), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
            </>
          )}
        </Stack>
      </Box>

      <style>{`@media print { body * { visibility: hidden; } .MuiPaper-root, .MuiBox-root, .printable, .MuiStack-root { visibility: visible; } }`}</style>
    </Box>
  );
}


