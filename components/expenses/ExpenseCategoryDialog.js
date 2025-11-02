'use client';

import * as React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, FormControlLabel, Switch, Stack } from '@mui/material';

export default function ExpenseCategoryDialog({ open, onClose, onSaved, initialValue }) {
  const [name, setName] = React.useState(initialValue?.name || '');
  const [active, setActive] = React.useState(initialValue?.active ?? true);
  const [sortOrder, setSortOrder] = React.useState(initialValue?.sortOrder ?? 0);
  const [submitting, setSubmitting] = React.useState(false);

  const isEdit = Boolean(initialValue && initialValue._id);

  React.useEffect(() => {
    if (open) {
      setName(initialValue?.name || '');
      setActive(initialValue?.active ?? true);
      setSortOrder(initialValue?.sortOrder ?? 0);
    }
  }, [open, initialValue]);

  const onSubmit = async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const payload = { name: name.trim(), active, sortOrder: Number(sortOrder || 0) };
      const url = isEdit ? `/api/expense-categories/${initialValue._id}` : '/api/expense-categories';
      const method = isEdit ? 'PATCH' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || json?.error || 'Save failed');
      onSaved?.(json);
    } catch (e) {
      // optionally surface error
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{isEdit ? 'Edit Category' : 'New Category'}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <TextField label="Sort Order" type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} inputProps={{ min: 0 }} />
          <FormControlLabel control={<Switch checked={active} onChange={(e) => setActive(e.target.checked)} />} label="Active" />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button onClick={onSubmit} disabled={submitting || !name.trim()} variant="contained">
          {isEdit ? 'Save' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}


