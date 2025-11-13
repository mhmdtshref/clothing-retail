'use client';

import * as React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Stack, TextField, Button, Typography } from '@mui/material';
import { useI18n } from '@/components/i18n/useI18n';

type Summary = {
  openingAmount: number;
  cashIn: number;
  cashOut: number;
  expectedCash: number;
  bySource: { sale: number; payment: number; return: number; adjustmentIn: number; adjustmentOut: number };
};

export default function CloseCashboxDialog({
  open,
  onClose,
  summary,
  onClosed,
}: {
  open: boolean;
  onClose: () => void;
  summary?: Summary | null;
  onClosed: (report: any) => void;
}) {
  const { t, formatNumber } = useI18n();
  const [counted, setCounted] = React.useState<string>('');
  const [note, setNote] = React.useState<string>('');
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setCounted('');
      setNote('');
    }
  }, [open]);

  const submit = async () => {
    const countedAmount = Number(counted || 0);
    if (!(countedAmount >= 0)) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/cashbox/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ countedAmount, note }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || 'Failed to close cashbox');
      onClosed(json?.report || json);
      onClose();
    } catch (e) {
      alert(e?.message || String(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{t('cashbox.closeTitle')}</DialogTitle>
      <DialogContent>
        <Stack spacing={1} sx={{ mt: 1 }}>
          {summary && (
            <>
              <Typography color="text.secondary">
                {t('cashbox.expected')}: {formatNumber(summary.expectedCash, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Typography>
            </>
          )}
          <TextField
            label={t('cashbox.countedAmount')}
            type="number"
            inputProps={{ min: 0, step: '0.01' }}
            value={counted}
            onChange={(e) => setCounted(e.target.value)}
          />
          <TextField
            label={t('cashbox.note')}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            multiline
            minRows={2}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.cancel')}</Button>
        <Button disabled={submitting} variant="contained" onClick={submit}>{t('cashbox.confirmClose')}</Button>
      </DialogActions>
    </Dialog>
  );
}


