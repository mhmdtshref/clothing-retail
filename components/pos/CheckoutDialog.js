'use client';

import * as React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Stack, TextField, MenuItem, Typography, ToggleButtonGroup, ToggleButton,
} from '@mui/material';
import { useI18n } from '@/components/i18n/useI18n';

export default function CheckoutDialog({ open, onClose, onConfirm, grandTotal, isReturn = false, initialContact }) {
  const { t, formatNumber } = useI18n();
  const [method, setMethod] = React.useState('cash');
  const [note, setNote] = React.useState('');
  const [reason, setReason] = React.useState('');
  const [payMode, setPayMode] = React.useState('full'); // 'full' | 'deposit'
  const [depositAmount, setDepositAmount] = React.useState('');

  const METHODS = React.useMemo(() => ([
    { value: 'cash', label: t('payment.cash') },
    { value: 'external_card', label: t('payment.externalCard') },
    { value: 'other', label: t('payment.other') },
  ]), [t]);

  React.useEffect(() => {
    if (open) {
      setMethod('cash');
      setNote('');
      setReason('');
      setPayMode('full');
      setDepositAmount('');
    }
  }, [open]);

  return (
    <>
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{t('pos.checkout')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {!isReturn && (
            <ToggleButtonGroup
              exclusive
              color="primary"
              size="small"
              value={payMode}
              onChange={(_e, v) => { if (v) setPayMode(v); }}
            >
              <ToggleButton value="full">{t('checkout.fullPayment')}</ToggleButton>
              <ToggleButton value="deposit">{t('checkout.deposit')}</ToggleButton>
            </ToggleButtonGroup>
          )}
          <TextField select label={t('checkout.paymentMethod')} value={method} onChange={(e) => setMethod(e.target.value)}>
          {METHODS.map((m) => (
            <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
          ))}
          </TextField>
          {!isReturn && payMode === 'deposit' && (
            <TextField
              label={t('checkout.amountPaidNow')}
              type="number"
              inputProps={{ min: 0, step: '0.01' }}
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
            />
          )}
          <TextField label={t('common.note')} value={note} onChange={(e) => setNote(e.target.value)} multiline minRows={2} />
          {isReturn && (
            <TextField label={t('checkout.returnReasonOptional')} value={reason} onChange={(e) => setReason(e.target.value)} multiline minRows={2} />
          )}
          <Typography variant="h6" sx={{ textAlign: 'right' }}>{t('common.total')}: {formatNumber(grandTotal, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.cancel')}</Button>
        <Button
          variant="contained"
          onClick={() => onConfirm({
            method,
            note,
            reason,
            payMode,
            depositAmount: Number(depositAmount || 0),
          })}
        >
          {isReturn ? t('checkout.confirmReturn') : t('checkout.confirmAndPay')}
        </Button>
      </DialogActions>
    </Dialog>
    </>
  );
}


