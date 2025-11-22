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

const productSchema = z.object({
  code: z
    .string()
    .min(1)
    .max(120)
    .transform((s) => s.trim()),
  basePrice: z.preprocess(
    (v) => (typeof v === 'string' ? Number(v) : v),
    z.number().nonnegative().default(0),
  ),
  status: z.enum(['active', 'archived']).default('active'),
});

const genSchema = z.object({
  sizes: z.array(z.string().min(1)),
  colors: z.array(z.string().min(1)),
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

export default function CreateProductForm({ companies }) {
  const router = useRouter();
  const { t } = useI18n();
  const [values, setValues] = React.useState({
    code: '',
    basePrice: '',
    status: 'active',
    sizes: [],
    colors: [],
    companyIds: [],
  });
  const [image, setImage] = React.useState(null);

  const [submitting, setSubmitting] = React.useState(false);
  const [snack, setSnack] = React.useState({ open: false, message: '', severity: 'success' });

  const sizes = values.sizes;
  const colors = values.colors;
  const selectedCompanies = React.useMemo(
    () => companies.filter((c) => values.companyIds.includes(c._id)),
    [companies, values.companyIds],
  );

  const preview = React.useMemo(
    () => cartesianPreview(sizes, colors, selectedCompanies, 10),
    [sizes, colors, selectedCompanies],
  );

  const handleChange = (field) => (e) => {
    setValues((v) => ({ ...v, [field]: e.target.value }));
  };

  async function onSubmit(e) {
    e.preventDefault();
    try {
      setSubmitting(true);

      const prodInput = productSchema.parse({
        code: values.code,
        basePrice: values.basePrice === '' ? 0 : values.basePrice,
        status: values.status,
      });

      const genInput = genSchema.parse({
        sizes,
        colors,
        companyIds: values.companyIds,
      });

      if (
        genInput.sizes.length === 0 ||
        genInput.colors.length === 0 ||
        genInput.companyIds.length === 0
      ) {
        throw new Error(t('errors.provideSizeColorCompany'));
      }

      // 1) Create product
      const res1 = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...prodInput, image: image || undefined }),
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
        const msg =
          data2?.message || data2?.error || t('errors.variantGenerationFailed');
        throw new Error(msg);
      }

      setSnack({
        open: true,
        severity: 'success',
        message: `${t('products.createdLabel')}: ${data1.product.code}. ${t('products.variantsLabel')}: ${data2.created} ${t('products.createdCount')}, ${data2.skippedExisting} ${t('products.skippedCount')}.`,
      });
      // Optionally redirect to dashboard or a future product detail page
      setTimeout(() => {
        router.push('/dashboard');
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
              <Typography variant="subtitle2" sx={{ mb: 1 }}>{t('products.imageOptional')}</Typography>
              <ProductImageUploader value={image} onChange={setImage} />
            </Box>
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label={t('products.code')}
              value={values.code}
              onChange={handleChange('code')}
              required
              fullWidth
            />
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
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
            <Autocomplete
              multiple
              freeSolo
              options={[]}
              value={values.sizes}
              onChange={(_, newVal) =>
                setValues((v) => ({
                  ...v,
                  sizes: Array.from(new Set(newVal.map((x) => String(x).trim()).filter(Boolean))),
                }))
              }
              fullWidth
              sx={{ flex: 1, minWidth: 0 }}
              renderInput={(params) => (
                <TextField {...params} label={t('products.sizes')} placeholder={t('products.typeAndEnter')} fullWidth />
              )}
            />
            <Autocomplete
              multiple
              freeSolo
              options={[]}
              value={values.colors}
              onChange={(_, newVal) =>
                setValues((v) => ({
                  ...v,
                  colors: Array.from(new Set(newVal.map((x) => String(x).trim()).filter(Boolean))),
                }))
              }
              fullWidth
              sx={{ flex: 1, minWidth: 0 }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={t('products.colors')}
                  placeholder={t('products.typeAndEnter')}
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
                    <TableCell>{r.size}</TableCell>
                    <TableCell>{r.color}</TableCell>
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
                    basePrice: '',
                    status: 'active',
                    sizes: [],
                    colors: [],
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
