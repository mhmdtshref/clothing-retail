'use client';

import * as React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Stack } from '@mui/material';

export default function CompanyDialog({ open, onClose, onSaved, initialValue }) {
  const [name, setName] = React.useState(initialValue?.name || '');
  const [submitting, setSubmitting] = React.useState(false);

  const isEdit = Boolean(initialValue && initialValue._id);

  React.useEffect(() => {
    if (open) {
      setName(initialValue?.name || '');
    }
  }, [open, initialValue]);

  const onSubmit = async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const payload = { name: name.trim() };
      const url = isEdit ? `/api/companies/${initialValue._id}` : '/api/companies';
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
      <DialogTitle>{isEdit ? 'Edit Company' : 'New Company'}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} />
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


