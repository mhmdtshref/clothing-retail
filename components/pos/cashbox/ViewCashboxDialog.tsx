'use client';

import * as React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from '@mui/material';
import { useI18n } from '@/components/i18n/useI18n';

export default function ViewCashboxDialog({
  open,
  onClose,
  expected = 0,
}: {
  open: boolean;
  onClose: () => void;
  expected?: number;
}) {
  const { t, formatNumber } = useI18n();
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{t('cashbox.viewTitle')}</DialogTitle>
      <DialogContent>
        <Typography variant="body1" sx={{ mt: 1 }}>
          {t('cashbox.expectedNow')}: {formatNumber(expected, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.close')}</Button>
      </DialogActions>
    </Dialog>
  );
}


