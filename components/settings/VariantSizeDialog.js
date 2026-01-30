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

export default function VariantSizeDialog({
  open,
  onClose,
  onSaved,
  initialValue,
  existingSizes = [],
}) {
  const { t } = useI18n();
  const [en, setEn] = React.useState(initialValue?.name?.en || '');
  const [ar, setAr] = React.useState(initialValue?.name?.ar || '');
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState('');

  const isEdit = Boolean(initialValue && initialValue._id);

  React.useEffect(() => {
    if (open) {
      setEn(initialValue?.name?.en || '');
      setAr(initialValue?.name?.ar || '');
      setError('');
    }
  }, [open, initialValue]);

  const onSubmit = async () => {
    if (!String(en || '').trim() || !String(ar || '').trim()) return;
    setSubmitting(true);
    try {
      setError('');
      const payload = { name: { en: String(en).trim(), ar: String(ar).trim() } };
      const nextKey = normalizeCompanyName(payload.name.en);
      const currentId = isEdit ? String(initialValue?._id || '') : '';
      const conflictLocal = (existingSizes || []).some((s) => {
        const id = String(s?._id || '');
        if (currentId && id === currentId) return false;
        return normalizeCompanyName(s?.name?.en || '') === nextKey;
      });
      if (conflictLocal) {
        setError(t('errors.sizeNameExists'));
        return;
      }

      const url = isEdit ? `/api/variant-sizes/${initialValue._id}` : '/api/variant-sizes';
      const method = isEdit ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        if (res.status === 409) throw new Error(json?.message || t('errors.sizeNameExists'));
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
      <DialogTitle>{isEdit ? t('variantSizes.edit') : t('variantSizes.new')}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label={t('common.nameEn')}
            value={en}
            onChange={(e) => setEn(e.target.value)}
            error={Boolean(error)}
          />
          <TextField
            label={t('common.nameAr')}
            value={ar}
            onChange={(e) => setAr(e.target.value)}
            error={Boolean(error)}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          {t('common.cancel')}
        </Button>
        <Button
          onClick={onSubmit}
          disabled={submitting || !String(en || '').trim() || !String(ar || '').trim()}
          variant="contained"
        >
          {isEdit ? t('common.save') : t('common.create')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
