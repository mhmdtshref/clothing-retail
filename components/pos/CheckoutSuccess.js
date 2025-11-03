'use client';

import * as React from 'react';
import { Box, Stack, Typography, Button, Divider, Table, TableHead, TableRow, TableCell, TableBody } from '@mui/material';

export default function CheckoutSuccess({ receipt, totals, paidTotal, dueTotal, onNewSale }) {
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
        <Typography variant="h6">{isReturn ? 'Return Completed' : (isPending ? 'Sale Pending' : 'Sale Completed')}</Typography>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={onPrint}>Print</Button>
          <Button variant="contained" onClick={onNewSale}>New sale</Button>
        </Stack>
      </Stack>
      <Divider sx={{ mb: 2 }} />
      <Box ref={printRef} sx={{ bgColor: 'white' }}>
        <Typography variant="subtitle2" color="text.secondary">{isReturn ? 'Return' : 'Receipt'} #{String(receipt?._id || '').slice(-6)}</Typography>
        <Typography variant="body2">Date: {new Date(receipt?.date || Date.now()).toLocaleString()}</Typography>
        <Divider sx={{ my: 1 }} />
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Item</TableCell>
              <TableCell>Variant</TableCell>
              <TableCell align="right">Qty</TableCell>
              <TableCell align="right">Unit</TableCell>
              <TableCell align="right">Disc</TableCell>
              <TableCell align="right">Net</TableCell>
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
                  <TableCell align="right">{q}</TableCell>
                  <TableCell align="right">{unit.toFixed(2)}</TableCell>
                  <TableCell align="right">{typeof d === 'string' ? d : Number(d).toFixed(2)}</TableCell>
                  <TableCell align="right">{net.toFixed(2)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <Divider sx={{ my: 1 }} />
        <Stack alignItems="flex-end" spacing={0.5}>
          <Typography>Item Subtotal: {Number(totals?.itemSubtotal || 0).toFixed(2)}</Typography>
          <Typography>Item Discounts: -{Number(totals?.itemDiscountTotal || 0).toFixed(2)}</Typography>
          <Typography>Bill Discount: -{Number(totals?.billDiscountTotal || 0).toFixed(2)}</Typography>
          <Typography>Tax ({Number(totals?.taxPercent || 0)}%): {Number(totals?.taxTotal || 0).toFixed(2)}</Typography>
          <Typography variant="h6">Grand Total: {Number(totals?.grandTotal || 0).toFixed(2)}</Typography>
          {(isPending || computedPaid > 0) && (
            <>
              <Typography>Paid: {Number(computedPaid || 0).toFixed(2)}</Typography>
              <Typography>Balance: {Number(computedDue || 0).toFixed(2)}</Typography>
            </>
          )}
        </Stack>
      </Box>

      <style>{`@media print { body * { visibility: hidden; } .MuiPaper-root, .MuiBox-root, .printable, .MuiStack-root { visibility: visible; } }`}</style>
    </Box>
  );
}


