'use client';

import * as React from 'react';
import {
  Box, Stack, Paper, Typography, TextField, Select, MenuItem, InputLabel, FormControl,
  Chip, Button, Snackbar, Alert,
  Table, TableHead, TableRow, TableCell, TableBody,
  Divider,
  Autocomplete,
} from '@mui/material';
import { ProductImageUploader } from '@/components/uploads';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/components/i18n/useI18n';
import ResponsiveActionsBar from '@/components/common/ResponsiveActionsBar';
import { pickLocalizedName } from '@/lib/i18n/name';

function normId(s) {
  return String(s ?? '').trim();
}

function uniqIds(arr) {
  return Array.from(new Set((arr || []).map(normId).filter(Boolean)));
}

function variantKey({ sizeId, colorId, companyId }) {
  return `${normId(sizeId)}|${normId(colorId)}|${String(companyId ?? '')}`;
}

export default function ProductDetailsPage({
  productId,
  companies = [],
  variantSizes = [],
  variantColors = [],
}) {
  const router = useRouter();
  const { t, locale } = useI18n();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [product, setProduct] = React.useState(null);
  const [variants, setVariants] = React.useState([]);
  const [variantsLoading, setVariantsLoading] = React.useState(true);
  const [variantsError, setVariantsError] = React.useState('');
  const [qtyDraftById, setQtyDraftById] = React.useState({});
  const [savingVariantId, setSavingVariantId] = React.useState(null);
  const [editing, setEditing] = React.useState(null);
  const [snack, setSnack] = React.useState({ open: false, message: '', severity: 'success' });

  // Variant generation UI state
  const [lockedDims, setLockedDims] = React.useState({
    sizeIds: [],
    colorIds: [],
    companyIds: [],
  });
  const [draftDims, setDraftDims] = React.useState({
    sizeIds: [],
    colorIds: [],
    companyIds: [],
  });
  const [pendingVariants, setPendingVariants] = React.useState([]);
  const [applying, setApplying] = React.useState(false);
  const [savingNewVariants, setSavingNewVariants] = React.useState(false);

  React.useEffect(() => {
    // Initialize qty drafts from loaded variants (do not clobber in-progress edits)
    setQtyDraftById((prev) => {
      const next = { ...prev };
      for (const v of variants || []) {
        const id = String(v?._id || '');
        if (!id) continue;
        if (typeof next[id] === 'undefined') next[id] = String(v?.qty ?? 0);
      }
      return next;
    });
  }, [variants]);

  // Derive locked dimensions from the existing variants; enforce add-only in drafts
  React.useEffect(() => {
    const lockedSizeIds = uniqIds((variants || []).map((v) => v?.sizeId));
    const lockedColorIds = uniqIds((variants || []).map((v) => v?.colorId));
    const lockedCompanyIds = Array.from(
      new Set((variants || []).map((v) => String(v?.companyId ?? '')).filter(Boolean)),
    );

    setLockedDims({ sizeIds: lockedSizeIds, colorIds: lockedColorIds, companyIds: lockedCompanyIds });
    setDraftDims((prev) => ({
      sizeIds: uniqIds([...(prev?.sizeIds || []), ...lockedSizeIds]),
      colorIds: uniqIds([...(prev?.colorIds || []), ...lockedColorIds]),
      companyIds: Array.from(new Set([...(prev?.companyIds || []), ...lockedCompanyIds])),
    }));
  }, [variants]);

  const loadAll = React.useCallback(async () => {
    setLoading(true); setError('');
    setVariantsLoading(true); setVariantsError('');
    try {
      const pRes = await fetch(`/api/products/${productId}`, { cache: 'no-store' });
      const pJson = await pRes.json();
      if (!pRes.ok) throw new Error(pJson?.message || pJson?.error || t('errors.loadProduct'));
      setProduct(pJson.product);
      setEditing({
        code: pJson.product.code || '',
        localCode: pJson.product.localCode || '',
        basePrice: Number(pJson.product.basePrice || 0),
        status: pJson.product.status || 'active',
        image: pJson.product.image || null,
      });

      const vRes = await fetch(`/api/products/${productId}/variants`, { cache: 'no-store' });
      const vJson = await vRes.json();
      if (!vRes.ok) {
        setVariants([]);
        setVariantsError(vJson?.message || vJson?.error || 'Failed to load variants');
      } else {
        setVariants(Array.isArray(vJson?.items) ? vJson.items : []);
      }
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
      setVariantsLoading(false);
    }
  }, [productId, t]);

  React.useEffect(() => { loadAll(); }, [loadAll]);

  const companyById = React.useMemo(() => {
    const map = new Map();
    for (const c of companies || []) map.set(String(c?._id ?? ''), c);
    return map;
  }, [companies]);

  const existingVariantKeySet = React.useMemo(() => {
    const s = new Set();
    for (const v of variants || []) {
      const k = variantKey({ sizeId: v?.sizeId, colorId: v?.colorId, companyId: v?.companyId });
      if (k.includes('||')) continue;
      s.add(k);
    }
    return s;
  }, [variants]);

  function forceAddOnlyDraft(nextDraft) {
    return {
      sizeIds: uniqIds([...(nextDraft?.sizeIds || []), ...(lockedDims?.sizeIds || [])]),
      colorIds: uniqIds([...(nextDraft?.colorIds || []), ...(lockedDims?.colorIds || [])]),
      companyIds: Array.from(
        new Set([...(nextDraft?.companyIds || []), ...(lockedDims?.companyIds || [])]),
      ),
    };
  }

  async function onApplyVariants() {
    setApplying(true);
    try {
      const sizeIds = uniqIds(draftDims.sizeIds);
      const colorIds = uniqIds(draftDims.colorIds);
      const companyIds = Array.from(new Set((draftDims.companyIds || []).map((x) => String(x)).filter(Boolean)));

      if (sizeIds.length === 0 || colorIds.length === 0 || companyIds.length === 0) {
        setSnack({ open: true, severity: 'error', message: t('errors.provideSizeColorCompany') });
        return;
      }

      const rows = [];
      for (const sizeId of sizeIds) {
        for (const colorId of colorIds) {
          for (const companyId of companyIds) {
            const key = variantKey({ sizeId, colorId, companyId });
            if (existingVariantKeySet.has(key)) continue;
            const company = companyById.get(String(companyId));
            const sizeObj = (variantSizes || []).find((s) => String(s?._id) === String(sizeId));
            const colorObj = (variantColors || []).find((c) => String(c?._id) === String(colorId));
            rows.push({
              _key: key,
              companyId,
              companyName: company?.name || '-',
              sizeId,
              colorId,
              sizeLabel: pickLocalizedName(sizeObj?.name, locale),
              colorLabel: pickLocalizedName(colorObj?.name, locale),
            });
          }
        }
      }

      setPendingVariants(rows);
      if (rows.length === 0) {
        setSnack({ open: true, severity: 'info', message: t('products.noNewVariantsToAdd') });
      }
    } finally {
      setApplying(false);
    }
  }

  async function onSaveNewVariants() {
    const sizeIds = uniqIds(draftDims.sizeIds);
    const colorIds = uniqIds(draftDims.colorIds);
    const companyIds = Array.from(new Set((draftDims.companyIds || []).map((x) => String(x)).filter(Boolean)));

    if (sizeIds.length === 0 || colorIds.length === 0 || companyIds.length === 0) {
      setSnack({ open: true, severity: 'error', message: t('errors.provideSizeColorCompany') });
      return;
    }

    setSavingNewVariants(true);
    try {
      const res = await fetch(`/api/products/${productId}/variants/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sizeIds, colorIds, companyIds }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.message || json?.error || t('errors.saveFailed'));
      }

      setSnack({
        open: true,
        severity: 'success',
        message: `${t('products.variantsLabel')}: ${json?.created ?? 0} ${t('products.createdCount')}, ${json?.skippedExisting ?? 0} ${t('products.skippedCount')}.`,
      });
      setPendingVariants([]);
      await loadAll();
    } catch (e) {
      setSnack({ open: true, severity: 'error', message: e?.message || String(e) });
    } finally {
      setSavingNewVariants(false);
    }
  }

  async function onSaveVariantQty(variantId) {
    const id = String(variantId || '');
    if (!id) return;

    const raw =
      typeof qtyDraftById[id] === 'undefined'
        ? String((variants || []).find((v) => String(v?._id) === id)?.qty ?? 0)
        : qtyDraftById[id];
    const n = Number(raw);
    if (!Number.isFinite(n) || !Number.isInteger(n)) {
      setSnack({ open: true, severity: 'error', message: 'Invalid quantity' });
      return;
    }

    setSavingVariantId(id);
    try {
      const res = await fetch(`/api/inventory/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qty: n }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || json?.error || 'Failed to save');

      const newQty = Number(json?.qty ?? n);
      setVariants((prev) => (prev || []).map((v) => (String(v?._id) === id ? { ...v, qty: newQty } : v)));
      setQtyDraftById((prev) => ({ ...(prev || {}), [id]: String(newQty) }));
      setSnack({ open: true, severity: 'success', message: t('common.saved') });
    } catch (e) {
      setSnack({ open: true, severity: 'error', message: e?.message || String(e) });
    } finally {
      setSavingVariantId(null);
    }
  }

  async function onSave() {
    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: editing.code,
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
      localCode: product.localCode || '',
      basePrice: Number(product.basePrice || 0),
      status: product.status || 'active',
      image: product.image || null,
    });
  }

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
              <TextField label={t('products.localCode')} value={product.localCode || ''} fullWidth disabled />
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

          <Paper sx={{ p: 2 }}>
            <Stack spacing={2}>
              <Typography variant="h6">{t('products.variants')}</Typography>

              <Divider />

              <Typography variant="subtitle1">{t('products.addMoreVariants')}</Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Autocomplete
                  multiple
                  options={variantSizes}
                  getOptionLabel={(o) => pickLocalizedName(o?.name, locale)}
                  value={(variantSizes || []).filter((s) => (draftDims.sizeIds || []).includes(String(s?._id)))}
                  onChange={(_, newVal) =>
                    setDraftDims((prev) =>
                      forceAddOnlyDraft({
                        ...prev,
                        sizeIds: newVal.map((x) => String(x._id)),
                      }),
                    )
                  }
                  fullWidth
                  sx={{ flex: 1, minWidth: 0 }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label={t('products.sizes')}
                      placeholder={t('products.selectOneOrMore')}
                      fullWidth
                    />
                  )}
                />
                <Autocomplete
                  multiple
                  options={variantColors}
                  getOptionLabel={(o) => pickLocalizedName(o?.name, locale)}
                  value={(variantColors || []).filter((c) => (draftDims.colorIds || []).includes(String(c?._id)))}
                  onChange={(_, newVal) =>
                    setDraftDims((prev) =>
                      forceAddOnlyDraft({
                        ...prev,
                        colorIds: newVal.map((x) => String(x._id)),
                      }),
                    )
                  }
                  fullWidth
                  sx={{ flex: 1, minWidth: 0 }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label={t('products.colors')}
                      placeholder={t('products.selectOneOrMore')}
                      fullWidth
                    />
                  )}
                />
              </Stack>

              <Autocomplete
                multiple
                options={companies}
                getOptionLabel={(o) => o?.name || ''}
                value={(companies || []).filter((c) => (draftDims.companyIds || []).includes(String(c?._id)))}
                onChange={(_, newVal) =>
                  setDraftDims((prev) =>
                    forceAddOnlyDraft({
                      ...prev,
                      companyIds: newVal.map((x) => String(x._id)),
                    }),
                  )
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={t('products.companiesSuppliers')}
                    placeholder={t('products.selectOneOrMore')}
                  />
                )}
              />

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="flex-end">
                <Button variant="outlined" onClick={onApplyVariants} disabled={applying || variantsLoading}>
                  {applying ? t('common.loading') : t('products.applyVariants')}
                </Button>
                <Button
                  variant="contained"
                  onClick={onSaveNewVariants}
                  disabled={savingNewVariants || pendingVariants.length === 0 || variantsLoading}
                >
                  {savingNewVariants ? t('common.saving') : t('products.saveNewVariants')}
                </Button>
              </Stack>

              {variantsLoading && <Typography color="text.secondary">{t('common.loading')}</Typography>}
              {!variantsLoading && variantsError && <Alert severity="error">{variantsError}</Alert>}

              {!variantsLoading && !variantsError && (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>{t('products.company')}</TableCell>
                      <TableCell>{t('products.size')}</TableCell>
                      <TableCell>{t('products.color')}</TableCell>
                      <TableCell>{t('common.status')}</TableCell>
                      <TableCell align="right">{t('pos.onHand')}</TableCell>
                      <TableCell align="right">{t('common.action')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(variants || []).map((v) => {
                      const id = String(v?._id || '');
                      const isSaving = savingVariantId === id;
                      const draft = typeof qtyDraftById?.[id] === 'undefined' ? String(v?.qty ?? 0) : qtyDraftById[id];
                      return (
                        <TableRow key={id} hover>
                          <TableCell>{v.companyName || '-'}</TableCell>
                          <TableCell>{v.size}</TableCell>
                          <TableCell>{v.color}</TableCell>
                          <TableCell>
                            <Chip size="small" label={t('common.saved')} color="success" variant="outlined" />
                          </TableCell>
                          <TableCell align="right" sx={{ width: 180 }}>
                            <TextField
                              size="small"
                              type="number"
                              value={draft}
                              onChange={(e) => setQtyDraftById((prev) => ({ ...(prev || {}), [id]: e.target.value }))}
                              onKeyDown={(e) => { if (e.key === 'Enter') onSaveVariantQty(id); }}
                              inputProps={{ step: 1 }}
                            />
                          </TableCell>
                          <TableCell align="right" sx={{ width: 140 }}>
                            <Button
                              size="small"
                              variant="contained"
                              onClick={() => onSaveVariantQty(id)}
                              disabled={isSaving}
                            >
                              {isSaving ? t('common.saving') : t('common.save')}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}

                    {(pendingVariants || []).map((v) => (
                      <TableRow key={`pending:${v._key}`} hover sx={{ opacity: 0.85 }}>
                        <TableCell>{v.companyName || '-'}</TableCell>
                        <TableCell>{v.sizeLabel}</TableCell>
                        <TableCell>{v.colorLabel}</TableCell>
                        <TableCell>
                          <Chip size="small" label={t('products.unsaved')} color="warning" variant="outlined" />
                        </TableCell>
                        <TableCell align="right" sx={{ width: 180 }}>
                          <TextField size="small" type="number" value={0} disabled inputProps={{ step: 1 }} />
                        </TableCell>
                        <TableCell align="right" sx={{ width: 140 }}>
                          <Typography color="text.secondary" variant="body2">—</Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
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


