'use client';

import * as React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, FormControlLabel, Switch, Stack } from '@mui/material';
import { useI18n } from '@/components/i18n/useI18n';

export default function ExpenseCategoryDialog({ open, onClose, onSaved, initialValue }) {
  const { t } = useI18n();
  const [name, setName] = React.useState(initialValue?.name || '');
  const [active, setActive] = React.useState(initialValue?.active ?? true);
  const [submitting, setSubmitting] = React.useState(false);

  const isEdit = Boolean(initialValue && initialValue._id);

  React.useEffect(() => {
    if (open) {
      setName(initialValue?.name || '');
      setActive(initialValue?.active ?? true);
    }
  }, [open, initialValue]);

  const onSubmit = async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const payload = { name: name.trim(), active };
      const url = isEdit ? `/api/expense-categories/${initialValue._id}` : '/api/expense-categories';
      const method = isEdit ? 'PATCH' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
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
      <DialogTitle>{isEdit ? t('expenses.editCategory') : t('expenses.newCategory')}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label={t('common.name')} value={name} onChange={(e) => setName(e.target.value)} />
          <FormControlLabel control={<Switch checked={active} onChange={(e) => setActive(e.target.checked)} />} label={t('status.active')} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          {t('common.cancel')}
        </Button>
        <Button onClick={onSubmit} disabled={submitting || !name.trim()} variant="contained">
          {isEdit ? t('common.save') : t('common.create')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}


