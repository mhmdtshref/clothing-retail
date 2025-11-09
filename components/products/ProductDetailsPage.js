'use client';

import * as React from 'react';
import {
  Box, Stack, Paper, Typography, TextField, Select, MenuItem, InputLabel, FormControl,
  Chip, Button, Snackbar, Alert,
} from '@mui/material';
import { ProductImageUploader } from '@/components/uploads';
import { useRouter } from 'next/navigation';

export default function ProductDetailsPage({ productId }) {
  const router = useRouter();
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
      if (!pRes.ok) throw new Error(pJson?.message || pJson?.error || 'Failed to load product');
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
      if (!res.ok) throw new Error('Failed to save');
      setProduct(json.product);
      setSnack({ open: true, severity: 'success', message: 'Saved' });
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
        <Typography variant="h5">{product?.code || 'Product'}</Typography>
        {product && <Chip size="small" label={product.status} color={product.status === 'active' ? 'success' : 'default'} />}
      </Stack>

      {loading && <Typography color="text.secondary">Loading…</Typography>}
      {error && !loading && <Alert severity="error">{error}</Alert>}

      {!loading && product && (
        <Stack spacing={2} sx={{ maxWidth: 1200, mx: 'auto' }}>
          <Paper sx={{ p: 2 }}>
            <Stack spacing={2}>
              <TextField label="Code" value={editing.code} onChange={(e) => setEditing((s) => ({ ...s, code: e.target.value }))} fullWidth />
              <TextField label="Name" value={editing.name} onChange={(e) => setEditing((s) => ({ ...s, name: e.target.value }))} fullWidth />
              <TextField label="Base Price" type="number" value={editing.basePrice} onChange={(e) => setEditing((s) => ({ ...s, basePrice: e.target.value }))} fullWidth />
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select label="Status" value={editing.status} onChange={(e) => setEditing((s) => ({ ...s, status: e.target.value }))}>
                  <MenuItem value="active">active</MenuItem>
                  <MenuItem value="archived">archived</MenuItem>
                </Select>
              </FormControl>
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Product Image</Typography>
                <ProductImageUploader value={editing.image} onChange={(img) => setEditing((s) => ({ ...s, image: img }))} />
                {editing.image && (
                  <Button sx={{ mt: 1 }} size="small" color="warning" onClick={() => setEditing((s) => ({ ...s, image: null }))}>Remove Image</Button>
                )}
              </Box>
            </Stack>
          </Paper>

          <Stack direction="row" justifyContent="flex-end" spacing={1}>
            <Button variant="outlined" onClick={onReset} disabled={!product}>Reset</Button>
            <Button variant="contained" onClick={onSave} disabled={!product}>Save</Button>
          </Stack>
        </Stack>
      )}

      <Snackbar open={snack.open} autoHideDuration={2500} onClose={() => setSnack((s) => ({ ...s, open: false }))}>
        <Alert onClose={() => setSnack((s) => ({ ...s, open: false }))} severity={snack.severity} variant="filled">{snack.message}</Alert>
      </Snackbar>
    </Box>
  );
}


