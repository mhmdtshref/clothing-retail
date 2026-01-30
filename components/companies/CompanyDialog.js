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
  Alert,
} from '@mui/material';
import { useI18n } from '@/components/i18n/useI18n';
import { normalizeCompanyName } from '@/lib/company-name';

export default function CompanyDialog({
  open,
  onClose,
  onSaved,
  initialValue,
  existingCompanies = [],
}) {
  const { t } = useI18n();
  const [name, setName] = React.useState(initialValue?.name || '');
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState('');

  const isEdit = Boolean(initialValue && initialValue._id);

  React.useEffect(() => {
    if (open) {
      setName(initialValue?.name || '');
      setError('');
    }
  }, [open, initialValue]);

  const onSubmit = async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      setError('');
      const payload = { name: name.trim() };
      const nextKey = normalizeCompanyName(payload.name);
      const currentId = isEdit ? String(initialValue?._id || '') : '';
      const conflictLocal = (existingCompanies || []).some((c) => {
        const id = String(c?._id || '');
        if (currentId && id === currentId) return false;
        return normalizeCompanyName(c?.name || '') === nextKey;
      });
      if (conflictLocal) {
        setError(t('errors.companyNameExists'));
        return;
      }
      const url = isEdit ? `/api/companies/${initialValue._id}` : '/api/companies';
      const method = isEdit ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          throw new Error(json?.message || t('errors.companyNameExists'));
        }
        throw new Error(json?.message || json?.error || t('errors.saveFailed'));
      }
      onSaved?.(json);
    } catch (e) {
      setError(e?.message || t('errors.saveFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{isEdit ? t('companies.edit') : t('companies.new')}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label={t('common.name')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={Boolean(error)}
          />
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
