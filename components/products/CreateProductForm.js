'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Paper, Stack, TextField, Button, Typography, MenuItem,
  Chip, Box, Divider, Table, TableHead, TableRow, TableCell, TableBody,
  Snackbar, Alert, Autocomplete
} from '@mui/material';
import { z } from 'zod';

const productSchema = z.object({
  code: z.string().min(1).max(120).transform(s => s.trim()),
  name: z.string().max(200).optional().default(''),
  basePrice: z.preprocess(
    (v) => (typeof v === 'string' ? Number(v) : v),
    z.number().nonnegative().default(0)
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
  const [values, setValues] = React.useState({
    code: '',
    name: '',
    basePrice: '',
    status: 'active',
    sizes: [],
    colors: [],
    companyIds: [],
  });

  const [submitting, setSubmitting] = React.useState(false);
  const [snack, setSnack] = React.useState({ open: false, message: '', severity: 'success' });

  const sizes = values.sizes;
  const colors = values.colors;
  const selectedCompanies = React.useMemo(
    () => companies.filter(c => values.companyIds.includes(c._id)),
    [companies, values.companyIds]
  );

  const preview = React.useMemo(
    () => cartesianPreview(sizes, colors, selectedCompanies, 10),
    [sizes, colors, selectedCompanies]
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
        name: values.name,
        basePrice: values.basePrice === '' ? 0 : values.basePrice,
        status: values.status,
      });

      const genInput = genSchema.parse({
        sizes,
        colors,
        companyIds: values.companyIds,
      });

      if (genInput.sizes.length === 0 || genInput.colors.length === 0 || genInput.companyIds.length === 0) {
        throw new Error('Please provide at least one Size, Color, and Company.');
      }

      // 1) Create product
      const res1 = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prodInput),
      });
      const data1 = await res1.json();
      if (!res1.ok) {
        const msg = data1?.message || data1?.error || 'Failed to create product';
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
        const msg = data2?.message || data2?.error || 'Product created but variant generation failed';
        throw new Error(msg);
      }

      setSnack({ open: true, severity: 'success', message: `Created: ${data1.product.code}. Variants: ${data2.created} created, ${data2.skippedExisting} skipped.` });
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
      <Typography variant="h5" gutterBottom>Create Product</Typography>
      <Box component="form" onSubmit={onSubmit}>
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Code"
              value={values.code}
              onChange={handleChange('code')}
              required
              fullWidth
            />
            <TextField
              label="Name"
              value={values.name}
              onChange={handleChange('name')}
              fullWidth
            />
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Base Price"
              value={values.basePrice}
              onChange={handleChange('basePrice')}
              type="number"
              inputProps={{ step: '0.01', min: '0' }}
              fullWidth
            />
            <TextField
              select
              label="Status"
              value={values.status}
              onChange={handleChange('status')}
              fullWidth
            >
              <MenuItem value="active">active</MenuItem>
              <MenuItem value="archived">archived</MenuItem>
            </TextField>
          </Stack>

          <Divider />

          <Typography variant="subtitle1">Variant generation</Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Autocomplete
              multiple
              freeSolo
              options={[]}
              value={values.sizes}
              onChange={(_, newVal) =>
                setValues(v => ({
                  ...v,
                  sizes: Array.from(new Set(newVal.map(x => String(x).trim()).filter(Boolean)))
                }))
              }
              fullWidth
              sx={{ flex: 1, minWidth: 0 }}
              renderInput={(params) => (
                <TextField {...params} label="Sizes" placeholder="Type and press Enter" fullWidth />
              )}
            />
            <Autocomplete
              multiple
              freeSolo
              options={[]}
              value={values.colors}
              onChange={(_, newVal) =>
                setValues(v => ({
                  ...v,
                  colors: Array.from(new Set(newVal.map(x => String(x).trim()).filter(Boolean)))
                }))
              }
              fullWidth
              sx={{ flex: 1, minWidth: 0 }}
              renderInput={(params) => (
                <TextField {...params} label="Colors" placeholder="Type and press Enter" fullWidth />
              )}
            />
          </Stack>

          <Autocomplete
            multiple
            options={companies}
            getOptionLabel={(o) => o.name}
            value={companies.filter(c => values.companyIds.includes(c._id))}
            onChange={(_, newVal) => setValues(v => ({ ...v, companyIds: newVal.map(x => x._id) }))}
            renderInput={(params) => (
              <TextField {...params} label="Companies (suppliers)" placeholder="Select one or more" />
            )}
          />

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Variant preview ({preview.total} total)
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Size</TableCell>
                  <TableCell>Color</TableCell>
                  <TableCell>Company</TableCell>
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
                      …and {preview.total - preview.rows.length} more
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Box>

          <Stack direction="row" spacing={2} justifyContent="flex-end">
            <Button
              variant="outlined"
              onClick={() =>
                setValues({
                  code: '', name: '', basePrice: '', status: 'active',
                  sizes: [], colors: [], companyIds: []
                })
              }
            >
              Reset
            </Button>
            <Button type="submit" variant="contained" disabled={submitting}>
              {submitting ? 'Creating…' : 'Create Product & Variants'}
            </Button>
          </Stack>
        </Stack>
      </Box>

      <Snackbar
        open={snack.open}
        autoHideDuration={3000}
        onClose={() => setSnack(s => ({ ...s, open: false }))}
      >
        <Alert
          onClose={() => setSnack(s => ({ ...s, open: false }))}
          severity={snack.severity}
          variant="filled"
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </Paper>
  );
}


