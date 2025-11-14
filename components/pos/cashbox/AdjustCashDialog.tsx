'use client';

import * as React from 'react';
import { DialogTitle, DialogContent, DialogActions, Stack, TextField, Button, ToggleButtonGroup, ToggleButton } from '@mui/material';
import { useI18n } from '@/components/i18n/useI18n';
import FullScreenDialog from '@/components/common/FullScreenDialog';

export default function AdjustCashDialog({ open, onClose, onAdjusted }: { open: boolean; onClose: () => void; onAdjusted: () => void }) {
  const { t } = useI18n();
  const [type, setType] = React.useState<'in' | 'out'>('in');
  const [amount, setAmount] = React.useState<string>('');
  const [reason, setReason] = React.useState<string>('');
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setType('in');
      setAmount('');
      setReason('');
    }
  }, [open]);

  const submit = async () => {
    const amt = Number(amount || 0);
    if (!(amt > 0)) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/cashbox/adjustments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, amount: amt, reason }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || 'Failed to adjust cash');
      onAdjusted();
      onClose();
    } catch (e) {
      alert(e?.message || String(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FullScreenDialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{t('cashbox.adjustTitle')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <ToggleButtonGroup exclusive size="small" value={type} onChange={(_e, v) => v && setType(v)}>
            <ToggleButton value="in">{t('cashbox.in')}</ToggleButton>
            <ToggleButton value="out">{t('cashbox.out')}</ToggleButton>
          </ToggleButtonGroup>
          <TextField
            label={t('cashbox.amount')}
            type="number"
            inputProps={{ min: 0, step: '0.01' }}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <TextField
            label={t('cashbox.reason')}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            multiline
            minRows={2}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.cancel')}</Button>
        <Button disabled={submitting} variant="contained" onClick={submit}>{t('cashbox.add')}</Button>
      </DialogActions>
    </FullScreenDialog>
  );
}


