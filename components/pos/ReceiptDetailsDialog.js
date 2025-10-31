'use client';

import * as React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack, Typography, Divider, Table, TableHead, TableRow, TableCell, TableBody } from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';

export default function ReceiptDetailsDialog({ id, open, onClose }) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [data, setData] = React.useState(null);

  React.useEffect(() => {
    async function load() {
      if (!open || !id) return;
      setLoading(true); setError('');
      try {
        const res = await fetch(`/api/receipts/${encodeURIComponent(String(id))}`, { cache: 'no-store' });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.message || json?.error || 'Failed to load receipt');
        setData(json);
      } catch (e) {
        setError(e?.message || String(e));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [open, id]);

  const onPrint = () => window.print();

  const r = data?.receipt || {}; const t = data?.totals || {};

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Receipt Details</DialogTitle>
      <DialogContent>
        {loading && <Typography sx={{ py: 2 }}>Loading…</Typography>}
        {!loading && error && <Typography color="error" sx={{ py: 2 }}>{error}</Typography>}
        {!loading && !error && data && (
          <>
            <Typography variant="body2">ID: {String(r._id)}</Typography>
            <Typography variant="body2">Type: {r.type}</Typography>
            <Typography variant="body2">Status: {r.status}</Typography>
            <Typography variant="body2">Date: {new Date(r.date).toLocaleString()}</Typography>
            {r.type === 'purchase' && <Typography variant="body2">Company: {r.companyName || '-'}</Typography>}
            {r.returnReason && <Typography variant="body2">Return Reason: {r.returnReason}</Typography>}
            {r.note && <Typography variant="body2">Note: {r.note}</Typography>}
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
                {(r.items || []).map((it, idx) => {
                  const s = it.snapshot || {}; const q = Number(it.qty||0); const unit = Number(it.unitPrice || it.unitCost || 0);
                  const line = unit * q; const d = it.discount ? (it.discount.mode === 'percent' ? `${it.discount.value}%` : it.discount.value) : 0;
                  const discAmt = it.discount ? (it.discount.mode === 'percent' ? (line * Number(it.discount.value || 0) / 100) : Number(it.discount.value || 0)) : 0;
                  const net = Math.max(0, line - discAmt);
                  return (
                    <TableRow key={idx}>
                      <TableCell>{s.productCode || '-'}</TableCell>
                      <TableCell>{`${s.size || ''} / ${s.color || ''}`}</TableCell>
                      <TableCell align="right">{q}</TableCell>
                      <TableCell align="right">{unit.toFixed(2)}</TableCell>
                      <TableCell align="right">{typeof d==='string' ? d : Number(d).toFixed(2)}</TableCell>
                      <TableCell align="right">{net.toFixed(2)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <Divider sx={{ my: 1 }} />
            <Stack alignItems="flex-end" spacing={0.5}>
              <Typography>Item Subtotal: {Number(t.itemSubtotal||0).toFixed(2)}</Typography>
              <Typography>Item Discounts: -{Number(t.itemDiscountTotal||0).toFixed(2)}</Typography>
              <Typography>Bill Discount: -{Number(t.billDiscountTotal||0).toFixed(2)}</Typography>
              <Typography>Tax ({Number(t.taxPercent||0)}%): {Number(t.taxTotal||0).toFixed(2)}</Typography>
              <Typography variant="h6">Grand Total: {Number(t.grandTotal||0).toFixed(2)}</Typography>
            </Stack>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button variant="contained" startIcon={<PrintIcon />} onClick={onPrint}>Print</Button>
      </DialogActions>
    </Dialog>
  );
}


