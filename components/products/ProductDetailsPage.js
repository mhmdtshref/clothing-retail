'use client';

import * as React from 'react';
import {
  Box, Stack, Paper, Typography, TextField, Select, MenuItem, InputLabel, FormControl,
  Chip, Button, Snackbar, Alert,
} from '@mui/material';
import { ProductImageUploader } from '@/components/uploads';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/components/i18n/useI18n';
import ResponsiveActionsBar from '@/components/common/ResponsiveActionsBar';

export default function ProductDetailsPage({ productId }) {
  const router = useRouter();
  const { t } = useI18n();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [product, setProduct] = React.useState(null);
  const [editing, setEditing] = React.useState(null);
  const [snack, setSnack] = React.useState({ open: false, message: '', severity: 'success' });
  

  const loadAll = React.useCallback(async () => {
    setLoading(true); setError('');
    try {
      const pRes = await fetch(`/api/products/${productId}`, { cache: 'no-store' });
      const pJson = await pRes.json();
      if (!pRes.ok) throw new Error(pJson?.message || pJson?.error || t('errors.loadProduct'));
      setProduct(pJson.product);
      setEditing({
        code: pJson.product.code || '',
        name: pJson.product.name || '',
        basePrice: Number(pJson.product.basePrice || 0),
        status: pJson.product.status || 'active',
        image: pJson.product.image || null,
      });
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }, [productId]);

  React.useEffect(() => { loadAll(); }, [loadAll]);

  async function onSave() {
    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: editing.code,
          name: editing.name,
          basePrice: Number(editing.basePrice || 0),
          status: editing.status,
          image: typeof editing.image === 'undefined' ? undefined : editing.image,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(t('errors.saveFailed'));
      setProduct(json.product);
      setSnack({ open: true, severity: 'success', message: t('common.saved') });
      router.push('/products');
    } catch (e) {
      setSnack({ open: true, severity: 'error', message: e?.message || String(e) });
    }
  }

  function onReset() {
    if (!product) return;
    setEditing({
      code: product.code || '',
      name: product.name || '',
      basePrice: Number(product.basePrice || 0),
      status: product.status || 'active',
      image: product.image || null,
    });
  }

  // Variants management removed for now

  return (
    <Box sx={{ p: 2 }}>
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h5">{product?.code || t('products.product')}</Typography>
        {product && <Chip size="small" label={product.status} color={product.status === 'active' ? 'success' : 'default'} />}
      </Stack>

      {loading && <Typography color="text.secondary">{t('common.loading')}</Typography>}
      {error && !loading && <Alert severity="error">{error}</Alert>}

      {!loading && product && (
        <Stack spacing={2} sx={{ maxWidth: 1200, mx: 'auto' }}>
          <Paper sx={{ p: 2 }}>
            <Stack spacing={2}>
              <TextField label={t('products.code')} value={editing.code} onChange={(e) => setEditing((s) => ({ ...s, code: e.target.value }))} fullWidth />
              <TextField label={t('common.name')} value={editing.name} onChange={(e) => setEditing((s) => ({ ...s, name: e.target.value }))} fullWidth />
              <TextField label={t('products.basePrice')} type="number" value={editing.basePrice} onChange={(e) => setEditing((s) => ({ ...s, basePrice: e.target.value }))} fullWidth />
              <FormControl fullWidth>
                <InputLabel>{t('common.status')}</InputLabel>
                <Select label={t('common.status')} value={editing.status} onChange={(e) => setEditing((s) => ({ ...s, status: e.target.value }))}>
                  <MenuItem value="active">{t('status.active')}</MenuItem>
                  <MenuItem value="archived">{t('status.archived')}</MenuItem>
                </Select>
              </FormControl>
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>{t('products.image')}</Typography>
                <ProductImageUploader value={editing.image} onChange={(img) => setEditing((s) => ({ ...s, image: img }))} />
                {editing.image && (
                  <Button sx={{ mt: 1 }} size="small" color="warning" onClick={() => setEditing((s) => ({ ...s, image: null }))}>{t('products.removeImage')}</Button>
                )}
              </Box>
            </Stack>
          </Paper>

          <ResponsiveActionsBar>
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="flex-end" spacing={1}>
              <Button variant="outlined" onClick={onReset} disabled={!product}>{t('common.reset')}</Button>
              <Button variant="contained" onClick={onSave} disabled={!product}>{t('common.save')}</Button>
            </Stack>
          </ResponsiveActionsBar>
        </Stack>
      )}

      <Snackbar open={snack.open} autoHideDuration={2500} onClose={() => setSnack((s) => ({ ...s, open: false }))}>
        <Alert onClose={() => setSnack((s) => ({ ...s, open: false }))} severity={snack.severity} variant="filled">{snack.message}</Alert>
      </Snackbar>
    </Box>
  );
}


