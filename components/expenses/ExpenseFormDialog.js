'use client';

import * as React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { useI18n } from '@/components/i18n/useI18n';

export default function ExpenseFormDialog({ open, onClose, onSaved, categories, initialValue }) {
  const { t } = useI18n();
  const [date, setDate] = React.useState(initialValue ? new Date(initialValue.date).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10));
  const [categoryId, setCategoryId] = React.useState(initialValue?.categoryId || '');
  const [amount, setAmount] = React.useState(initialValue ? String(initialValue.amount ?? 0) : '0');
  const [vendor, setVendor] = React.useState(initialValue?.vendor || '');
  const [note, setNote] = React.useState(initialValue?.note || '');
  const [submitting, setSubmitting] = React.useState(false);

  const isEdit = Boolean(initialValue && initialValue._id);

  const onSubmit = async () => {
    if (!categoryId) return;
    setSubmitting(true);
    try {
      const payload = {
        date: new Date(date).toISOString(),
        categoryId,
        amount: Number(amount || 0),
        vendor: vendor || undefined,
        note: note || undefined,
      };
      const url = isEdit ? `/api/expenses/${initialValue._id}` : '/api/expenses';
      const method = isEdit ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(t('errors.saveFailed'));
      onSaved?.(json);
    } catch (e) {
      // optionally surface error
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{isEdit ? t('expenses.edit') : t('expenses.new')}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label={t('common.date')} type="date" value={date} onChange={(e) => setDate(e.target.value)} InputLabelProps={{ shrink: true }} />

          <FormControl>
            <InputLabel id="cat-label">{t('expenses.category')}</InputLabel>
            <Select labelId="cat-label" label={t('expenses.category')} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              {categories.map((c) => (
                <MenuItem key={c._id} value={c._id}>
                  {c.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField label={t('expenses.amount')} type="number" value={amount} onChange={(e) => setAmount(e.target.value)} inputProps={{ min: 0, step: '0.01' }} />
          <TextField label={t('expenses.vendor')} value={vendor} onChange={(e) => setVendor(e.target.value)} />
          <TextField label={t('common.note')} value={note} onChange={(e) => setNote(e.target.value)} multiline minRows={2} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          {t('common.cancel')}
        </Button>
        <Button onClick={onSubmit} disabled={submitting || !categoryId} variant="contained">
          {isEdit ? t('common.save') : t('common.create')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}


