'use client';

import * as React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Stack, TextField, Button } from '@mui/material';
import { useI18n } from '@/components/i18n/useI18n';

export default function OpenCashboxDialog({ open, onClose, onOpened }: { open: boolean; onClose: () => void; onOpened: () => void }) {
  const { t } = useI18n();
  const [amount, setAmount] = React.useState<string>('');
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setAmount('');
    }
  }, [open]);

  const submit = async () => {
    const openingAmount = Number(amount || 0);
    if (openingAmount < 0) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/cashbox/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ openingAmount }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || 'Failed to open cashbox');
      onOpened();
      onClose();
    } catch (e) {
      alert(e?.message || String(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{t('cashbox.openTitle')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label={t('cashbox.openingAmount')}
            type="number"
            inputProps={{ min: 0, step: '0.01' }}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.cancel')}</Button>
        <Button disabled={submitting} variant="contained" onClick={submit}>{t('cashbox.openNow')}</Button>
      </DialogActions>
    </Dialog>
  );
}


