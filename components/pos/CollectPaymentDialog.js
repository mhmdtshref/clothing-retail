'use client';

import * as React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack, TextField, MenuItem, Typography } from '@mui/material';
import { useI18n } from '@/components/i18n/useI18n';
import { enqueuePayment } from '@/lib/offline/sync';

export default function CollectPaymentDialog({ open, onClose, receiptId, dueTotal = 0, onDone }) {
  const { t, formatNumber } = useI18n();
  const [method, setMethod] = React.useState('cash');
  const [amount, setAmount] = React.useState('');
  const [note, setNote] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  const METHODS = React.useMemo(() => ([
    { value: 'cash', label: t('payment.cash') },
    { value: 'external_card', label: t('payment.externalCard') },
    { value: 'other', label: t('payment.other') },
  ]), [t]);

  React.useEffect(() => {
    if (open) {
      setMethod('cash');
      setAmount(String(Number(dueTotal || 0).toFixed(2)));
      setNote('');
    }
  }, [open, dueTotal]);

  const submit = async () => {
    // Prevent cash collection when cashbox is closed
    try {
      const sess = await fetch('/api/cashbox/session', { cache: 'no-store' }).then((r) => r.json()).catch(() => null);
      if (!sess?.ok || !sess?.open) {
        alert(t('cashbox.openCashbox'));
        return;
      }
    } catch {}

    if (!receiptId) return;
    const amt = Number(amount || 0);
    if (!(amt > 0)) {
      alert(t('errors.amountGreaterThanZero'));
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
      if (!res.ok) throw new Error(t('errors.collectPaymentFailed'));
      onDone?.(json);
    } catch (e) {
      try {
        await enqueuePayment(String(receiptId), { amount: amt, method, note });
        alert(t('common.saved')); // queued
        onDone?.({ ok: true });
      } catch {
        alert(e?.message || String(e));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{t('pos.collectPayment')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography color="text.secondary">{t('collectPayment.due')}: {formatNumber(dueTotal, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
          <TextField select label={t('checkout.paymentMethod')} value={method} onChange={(e) => setMethod(e.target.value)}>
            {METHODS.map((m) => (
              <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
            ))}
          </TextField>
          <TextField label={t('collectPayment.amount')} type="number" inputProps={{ min: 0, step: '0.01' }} value={amount} onChange={(e) => setAmount(e.target.value)} />
          <TextField label={t('common.note')} value={note} onChange={(e) => setNote(e.target.value)} multiline minRows={2} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.cancel')}</Button>
        <Button disabled={submitting} variant="contained" onClick={submit}>{t('collectPayment.collect')}</Button>
      </DialogActions>
    </Dialog>
  );
}


