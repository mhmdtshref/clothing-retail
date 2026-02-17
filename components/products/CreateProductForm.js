'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Paper,
  Stack,
  TextField,
  Button,
  Typography,
  MenuItem,
  Chip,
  Box,
  Divider,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Snackbar,
  Alert,
  Autocomplete,
} from '@mui/material';
import { z } from 'zod';
import { ProductImageUploader } from '@/components/uploads';
import { useI18n } from '@/components/i18n/useI18n';
import ResponsiveActionsBar from '@/components/common/ResponsiveActionsBar';
import { pickLocalizedName } from '@/lib/i18n/name';

const productSchema = z.object({
  code: z
    .preprocess(
      (v) => {
        if (v === null || typeof v === 'undefined') return null;
        const s = String(v).trim();
        return s ? s : null;
      },
      z.union([z.string().max(120), z.null()]).optional(),
    )
    .optional(),
  costUSD: z.preprocess((v) => {
    // Prevent '' / whitespace from becoming 0
    if (v === null || typeof v === 'undefined') return v;
    if (typeof v === 'string' && v.trim() === '') return undefined;
    return typeof v === 'string' ? Number(v) : v;
  }, z.number().int().min(0).max(9999)),
  basePrice: z.preprocess(
    (v) => (typeof v === 'string' ? Number(v) : v),
    z.number().nonnegative().default(0),
  ),
  status: z.enum(['active', 'archived']).default('active'),
});

const genSchema = z.object({
  sizeIds: z.array(z.string().min(1)),
  colorIds: z.array(z.string().min(1)),
  companyIds: z.array(z.string().min(1)),
});

function cartesianPreview(sizes, colors, companies, limit = 10) {
  const rows = [];
  let total = 0;
  for (const size of sizes) {
    for (const color of colors) {
      for (const company of companies) {
        total++;
        if (rows.length < limit) {
          rows.push({ size, color, companyName: company.name, companyId: company._id });
        }
      }
    }
  }
  return { rows, total };
}

export default function CreateProductForm({
  companies,
  variantSizes = [],
  variantColors = [],
  sizeGroups = [],
}) {
  const router = useRouter();
  const { t, locale } = useI18n();
  const [values, setValues] = React.useState({
    code: '',
    costUSD: '',
    basePrice: '',
    status: 'active',
    sizeIds: [],
    colorIds: [],
    companyIds: [],
  });
  const [image, setImage] = React.useState(null);

  const [submitting, setSubmitting] = React.useState(false);
  const [snack, setSnack] = React.useState({ open: false, message: '', severity: 'success' });

  const selectedSizes = React.useMemo(() => {
    const sizeIdSet = new Set((values.sizeIds || []).map((x) => String(x)));
    return (variantSizes || []).filter((s) => sizeIdSet.has(String(s?._id)));
  }, [variantSizes, values.sizeIds]);
  const selectedColors = React.useMemo(() => {
    const colorIdSet = new Set((values.colorIds || []).map((x) => String(x)));
    return (variantColors || []).filter((c) => colorIdSet.has(String(c?._id)));
  }, [variantColors, values.colorIds]);
  const selectedCompanies = React.useMemo(
    () => companies.filter((c) => values.companyIds.includes(c._id)),
    [companies, values.companyIds],
  );

  const preview = React.useMemo(
    () => cartesianPreview(selectedSizes, selectedColors, selectedCompanies, 10),
    [selectedSizes, selectedColors, selectedCompanies],
  );

  const handleChange = (field) => (e) => {
    setValues((v) => ({ ...v, [field]: e.target.value }));
  };

  const variantSizeIdSet = React.useMemo(
    () => new Set((variantSizes || []).map((s) => String(s?._id))),
    [variantSizes],
  );

  const showSizeGroupShortcuts =
    (values.sizeIds?.length ?? 0) === 0 && Array.isArray(sizeGroups) && sizeGroups.length > 0;

  function addSizesByIds(ids) {
    setValues((v) => {
      const next = new Set((v.sizeIds || []).map((x) => String(x)));
      for (const id of ids || []) {
        const sid = String(id || '');
        if (!sid) continue;
        if (!variantSizeIdSet.has(sid)) continue; // ignore stale ids
        next.add(sid);
      }
      return { ...v, sizeIds: Array.from(next) };
    });
  }

  async function onSubmit(e) {
    e.preventDefault();
    try {
      setSubmitting(true);

      const prodInput = productSchema.parse({
        code: values.code,
        costUSD: values.costUSD,
        basePrice: values.basePrice === '' ? 0 : values.basePrice,
        status: values.status,
      });

      const genInput = genSchema.parse({
        sizeIds: values.sizeIds,
        colorIds: values.colorIds,
        companyIds: values.companyIds,
      });

      if (
        genInput.sizeIds.length === 0 ||
        genInput.colorIds.length === 0 ||
        genInput.companyIds.length === 0
      ) {
        throw new Error(t('errors.provideSizeColorCompany'));
      }

      // 1) Create product
      const res1 = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...prodInput,
          // allow backend to copy localCode if code is missing/null/blank
          code: prodInput?.code ?? null,
          image: image || undefined,
        }),
      });
      const data1 = await res1.json();
      if (!res1.ok) {
        const msg = data1?.message || data1?.error || t('errors.createProductFailed');
        throw new Error(msg);
      }
      const productId = data1.product?._id;

      // 2) Generate variants
      const res2 = await fetch(`/api/products/${productId}/variants/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(genInput),
      });
      const data2 = await res2.json();
      if (!res2.ok) {
        const msg = data2?.message || data2?.error || t('errors.variantGenerationFailed');
        throw new Error(msg);
      }

      setSnack({
        open: true,
        severity: 'success',
        message: `${t('products.createdLabel')}: ${data1.product.code}. ${t('products.variantsLabel')}: ${data2.created} ${t('products.createdCount')}, ${data2.skippedExisting} ${t('products.skippedCount')}.`,
      });
      // Optionally redirect to dashboard or a future product detail page
      setTimeout(() => {
        router.push('/products');
      }, 800);
    } catch (err) {
      setSnack({ open: true, severity: 'error', message: err?.message || String(err) });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        {t('products.createProduct')}
      </Typography>
      <Box component="form" onSubmit={onSubmit}>
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Box sx={{ width: '100%' }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                {t('products.imageOptional')}
              </Typography>
              <ProductImageUploader value={image} onChange={setImage} />
            </Box>
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label={t('products.code')}
              value={values.code}
              onChange={handleChange('code')}
              fullWidth
            />
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label={t('products.localCodeCostUSD')}
              helperText={t('products.localCodeCostUSDHelper')}
              value={values.costUSD}
              onChange={handleChange('costUSD')}
              type="number"
              inputProps={{ step: '1', min: '0', max: '9999' }}
              fullWidth
              required
            />
            <TextField
              label={t('products.basePrice')}
              value={values.basePrice}
              onChange={handleChange('basePrice')}
              type="number"
              inputProps={{ step: '0.01', min: '0' }}
              fullWidth
            />
            <TextField
              select
              label={t('common.status')}
              value={values.status}
              onChange={handleChange('status')}
              fullWidth
            >
              <MenuItem value="active">{t('status.active')}</MenuItem>
              <MenuItem value="archived">{t('status.archived')}</MenuItem>
            </TextField>
          </Stack>

          <Divider />

          <Typography variant="subtitle1">{t('products.variantGeneration')}</Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Stack spacing={1} sx={{ flex: 1, minWidth: 0 }}>
              {showSizeGroupShortcuts && (
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                  {sizeGroups.map((g) => (
                    <Chip
                      key={String(g._id)}
                      label={g.name}
                      size="small"
                      variant="outlined"
                      onClick={() => addSizesByIds(g.sizeIds)}
                      sx={{ mb: 0.5 }}
                    />
                  ))}
                </Stack>
              )}
              <Autocomplete
                multiple
                options={variantSizes}
                getOptionLabel={(o) => pickLocalizedName(o?.name, locale)}
                value={selectedSizes}
                onChange={(_, newVal) =>
                  setValues((v) => ({ ...v, sizeIds: newVal.map((x) => x._id) }))
                }
                fullWidth
                sx={{ minWidth: 0 }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={t('products.sizes')}
                    placeholder={t('products.selectOneOrMore')}
                    fullWidth
                  />
                )}
              />
            </Stack>
            <Autocomplete
              multiple
              options={variantColors}
              getOptionLabel={(o) => pickLocalizedName(o?.name, locale)}
              value={selectedColors}
              onChange={(_, newVal) =>
                setValues((v) => ({ ...v, colorIds: newVal.map((x) => x._id) }))
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
            getOptionLabel={(o) => o.name}
            value={companies.filter((c) => values.companyIds.includes(c._id))}
            onChange={(_, newVal) =>
              setValues((v) => ({ ...v, companyIds: newVal.map((x) => x._id) }))
            }
            renderInput={(params) => (
              <TextField
                {...params}
                label={t('products.companiesSuppliers')}
                placeholder={t('products.selectOneOrMore')}
              />
            )}
          />

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              {t('products.variantPreview')} ({preview.total} {t('common.total')})
            </Typography>
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small" sx={{ minWidth: 480 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>{t('products.size')}</TableCell>
                    <TableCell>{t('products.color')}</TableCell>
                    <TableCell>{t('products.company')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {preview.rows.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell>{pickLocalizedName(r.size?.name, locale)}</TableCell>
                      <TableCell>{pickLocalizedName(r.color?.name, locale)}</TableCell>
                      <TableCell>{r.companyName}</TableCell>
                    </TableRow>
                  ))}
                  {preview.total > preview.rows.length && (
                    <TableRow>
                      <TableCell colSpan={3}>
                        …{t('common.and')} {preview.total - preview.rows.length} {t('common.more')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Box>
          </Box>

          <ResponsiveActionsBar>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="flex-end">
              <Button
                variant="outlined"
                onClick={() =>
                  setValues({
                    code: '',
                    costUSD: '',
                    basePrice: '',
                    status: 'active',
                    sizeIds: [],
                    colorIds: [],
                    companyIds: [],
                  })
                }
              >
                {t('common.reset')}
              </Button>
              <Button type="submit" variant="contained" disabled={submitting}>
                {submitting ? t('products.creating') : t('products.createWithVariants')}
              </Button>
            </Stack>
          </ResponsiveActionsBar>
        </Stack>
      </Box>

      <Snackbar
        open={snack.open}
        autoHideDuration={3000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
      >
        <Alert
          onClose={() => setSnack((s) => ({ ...s, open: false }))}
          severity={snack.severity}
          variant="filled"
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </Paper>
  );
}
