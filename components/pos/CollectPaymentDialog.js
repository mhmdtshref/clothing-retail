'use client';

import * as React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack, TextField, MenuItem, Typography } from '@mui/material';

const METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'external_card', label: 'External Card Terminal' },
  { value: 'other', label: 'Other' },
];

export default function CollectPaymentDialog({ open, onClose, receiptId, dueTotal = 0, onDone }) {
  const [method, setMethod] = React.useState('cash');
  const [amount, setAmount] = React.useState('');
  const [note, setNote] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setMethod('cash');
      setAmount(String(Number(dueTotal || 0).toFixed(2)));
      setNote('');
    }
  }, [open, dueTotal]);

  const submit = async () => {
    if (!receiptId) return;
    const amt = Number(amount || 0);
    if (!(amt > 0)) {
      alert('Amount must be greater than 0');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/receipts/${encodeURIComponent(String(receiptId))}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amt, method, note }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || json?.error || 'Failed to collect payment');
      onDone?.(json);
    } catch (e) {
      alert(e?.message || String(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Collect Payment</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography color="text.secondary">Due: {Number(dueTotal || 0).toFixed(2)}</Typography>
          <TextField select label="Payment Method" value={method} onChange={(e) => setMethod(e.target.value)}>
            {METHODS.map((m) => (
              <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
            ))}
          </TextField>
          <TextField label="Amount" type="number" inputProps={{ min: 0, step: '0.01' }} value={amount} onChange={(e) => setAmount(e.target.value)} />
          <TextField label="Note" value={note} onChange={(e) => setNote(e.target.value)} multiline minRows={2} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button disabled={submitting} variant="contained" onClick={submit}>Collect</Button>
      </DialogActions>
    </Dialog>
  );
}


