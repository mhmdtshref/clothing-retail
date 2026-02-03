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
  Autocomplete,
} from '@mui/material';
import { useI18n } from '@/components/i18n/useI18n';
import { normalizeCompanyName } from '@/lib/company-name';
import { pickLocalizedName } from '@/lib/i18n/name';

export default function VariantSizeGroupDialog({
  open,
  onClose,
  onSaved,
  initialValue,
  existingGroups = [],
  sizes = [],
}) {
  const { t, locale } = useI18n();
  const [name, setName] = React.useState(initialValue?.name || '');
  const [sizeIds, setSizeIds] = React.useState(
    Array.isArray(initialValue?.sizeIds) ? initialValue.sizeIds.map((x) => String(x)) : [],
  );
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState('');

  const isEdit = Boolean(initialValue && initialValue._id);

  React.useEffect(() => {
    if (open) {
      setName(initialValue?.name || '');
      setSizeIds(
        Array.isArray(initialValue?.sizeIds) ? initialValue.sizeIds.map((x) => String(x)) : [],
      );
      setError('');
    }
  }, [open, initialValue]);

  const selectedSizes = React.useMemo(() => {
    const set = new Set((sizeIds || []).map((x) => String(x)));
    return (sizes || []).filter((s) => set.has(String(s?._id)));
  }, [sizes, sizeIds]);

  const canSubmit = Boolean(String(name || '').trim()) && (sizeIds || []).length > 0;

  const onSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      setError('');

      const payload = {
        name: String(name).trim(),
        sizeIds: (sizeIds || []).map((x) => String(x)),
      };

      const nextKey = normalizeCompanyName(payload.name);
      const currentId = isEdit ? String(initialValue?._id || '') : '';
      const conflictLocal = (existingGroups || []).some((g) => {
        const id = String(g?._id || '');
        if (currentId && id === currentId) return false;
        return normalizeCompanyName(g?.name || '') === nextKey;
      });
      if (conflictLocal) {
        setError(t('errors.sizeGroupNameExists') || 'Group name already exists.');
        return;
      }

      const url = isEdit
        ? `/api/variant-size-groups/${initialValue._id}`
        : '/api/variant-size-groups';
      const method = isEdit ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        if (res.status === 409)
          throw new Error(json?.message || t('errors.sizeGroupNameExists') || 'Conflict');
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
      <DialogTitle>
        {isEdit ? t('variantSizeGroups.edit') : t('variantSizeGroups.new')}
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label={t('variantSizeGroups.name')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={Boolean(error)}
          />
          <Autocomplete
            multiple
            options={sizes}
            getOptionLabel={(o) => pickLocalizedName(o?.name, locale)}
            value={selectedSizes}
            onChange={(_, newVal) => setSizeIds(newVal.map((x) => String(x._id)))}
            renderInput={(params) => (
              <TextField
                {...params}
                label={t('variantSizeGroups.sizes')}
                placeholder={t('products.selectOneOrMore')}
                error={Boolean(error)}
              />
            )}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          {t('common.cancel')}
        </Button>
        <Button onClick={onSubmit} disabled={submitting || !canSubmit} variant="contained">
          {isEdit ? t('common.save') : t('common.create')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

