'use client';

import * as React from 'react';
import {
  Paper, Stack, TextField, Button, Typography, MenuItem, Box, Divider,
  Autocomplete, Chip, Table, TableHead, TableRow, TableCell, TableBody,
  IconButton, InputAdornment, Snackbar, Alert, Select, FormControl, InputLabel
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import { computeReceiptTotals, computeLine } from '@/lib/pricing';

async function searchProducts(params) {
  const qs = new URLSearchParams({
    query: params.query || '',
    status: 'active',
    sort: 'code',
    order: 'asc',
    page: '1',
    limit: '20',
    includeVariantCounts: 'false',
  });
  const res = await fetch(`/api/products?${qs.toString()}`, { cache: 'no-store' });
  if (!res.ok) return { items: [] };
  return res.json();
}

export default function NewPurchaseReceipt({ companies }) {
  const [companyId, setCompanyId] = React.useState(companies[0]?._id || '');
  const [note, setNote] = React.useState('');
  const [taxPercent, setTaxPercent] = React.useState(0);
  const [billDiscount, setBillDiscount] = React.useState({ mode: 'amount', value: 0 });

  const [productQuery, setProductQuery] = React.useState('');
  const [productOptions, setProductOptions] = React.useState([]);
  const [loadingProducts, setLoadingProducts] = React.useState(false);

  const [selectedProduct, setSelectedProduct] = React.useState(null);
  const [variantOptions, setVariantOptions] = React.useState([]);
  const [loadingVariants, setLoadingVariants] = React.useState(false);

  const [items, setItems] = React.useState([]);
  const [snack, setSnack] = React.useState({ open: false, severity: 'success', message: '' });
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    const t = setTimeout(async () => {
      setLoadingProducts(true);
      try {
        const json = await searchProducts({ query: productQuery });
        setProductOptions(json.items || []);
      } finally {
        setLoadingProducts(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [productQuery]);

  async function loadVariants(productId, companyId) {
    if (!productId) return setVariantOptions([]);
    setLoadingVariants(true);
    try {
      const res = await fetch(`/api/products/${productId}/variants?companyId=${companyId}`, { cache: 'no-store' });
      const json = await res.json();
      setVariantOptions(json.items || []);
    } finally {
      setLoadingVariants(false);
    }
  }

  React.useEffect(() => {
    if (selectedProduct?._id && companyId) {
      loadVariants(selectedProduct._id, companyId);
    } else {
      setVariantOptions([]);
    }
  }, [selectedProduct?._id, companyId]);

  const addBlankItem = () => {
    setItems((arr) => [
      ...arr,
      { id: crypto.randomUUID(), variantId: '', variantLabel: '', qty: 1, unitCost: 0, discount: { mode: 'amount', value: 0 } },
    ]);
  };

  const removeItem = (id) => setItems((arr) => arr.filter((x) => x.id !== id));
  const updateItem = (id, patch) => setItems((arr) => arr.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const pricingPayload = React.useMemo(() => ({
    type: 'purchase',
    items: items.map((it) => ({
      qty: Number(it.qty) || 0,
      unitCost: Number(it.unitCost) || 0,
      discount: it.discount && Number(it.discount.value) > 0 ? { mode: it.discount.mode, value: Number(it.discount.value) } : undefined,
    })),
    billDiscount: billDiscount && Number(billDiscount.value) > 0 ? { mode: billDiscount.mode, value: Number(billDiscount.value) } : undefined,
    taxPercent: Number(taxPercent) || 0,
  }), [items, billDiscount, taxPercent]);

  const { totals } = computeReceiptTotals(pricingPayload);

  async function onSubmit(e) {
    e.preventDefault();
    if (!companyId) {
      setSnack({ open: true, severity: 'error', message: 'Please select a company.' });
      return;
    }
    if (items.length === 0) {
      setSnack({ open: true, severity: 'error', message: 'Add at least one line item.' });
      return;
    }
    if (items.some((it) => !it.variantId)) {
      setSnack({ open: true, severity: 'error', message: 'Choose a variant for each item.' });
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        type: 'purchase',
        companyId,
        items: items.map((it) => ({
          variantId: it.variantId,
          qty: Number(it.qty) || 0,
          unitCost: Number(it.unitCost) || 0,
          discount: it.discount && Number(it.discount.value) > 0 ? { mode: it.discount.mode, value: Number(it.discount.value) } : undefined,
        })),
        billDiscount: billDiscount && Number(billDiscount.value) > 0 ? { mode: billDiscount.mode, value: Number(billDiscount.value) } : undefined,
        taxPercent: Number(taxPercent) || 0,
        note: note || undefined,
      };

      const res = await fetch('/api/receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || json?.error || 'Failed to create receipt');
      setSnack({ open: true, severity: 'success', message: `Receipt created. Total: ${json.totals.grandTotal}` });
      setItems([]);
      setSelectedProduct(null);
      setVariantOptions([]);
      setNote('');
      setTaxPercent(0);
      setBillDiscount({ mode: 'amount', value: 0 });
    } catch (err) {
      setSnack({ open: true, severity: 'error', message: err?.message || String(err) });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>New Receipt (Purchase)</Typography>

      <Box component="form" onSubmit={onSubmit}>
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <FormControl fullWidth>
              <InputLabel id="company-label">Company</InputLabel>
              <Select labelId="company-label" label="Company" value={companyId} onChange={(e) => setCompanyId(e.target.value)} required>
                {companies.map((c) => (<MenuItem key={c._id} value={c._id}>{c.name}</MenuItem>))}
              </Select>
            </FormControl>
            <TextField label="Note" value={note} onChange={(e) => setNote(e.target.value)} fullWidth />
          </Stack>

          <Divider />

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              label="Search product"
              placeholder="Type code or name"
              value={productQuery}
              onChange={(e) => setProductQuery(e.target.value)}
              InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon /></InputAdornment>) }}
              fullWidth
            />
            <Autocomplete
              loading={loadingProducts}
              options={productOptions}
              getOptionLabel={(o) => `${o.code}${o.name ? ' — ' + o.name : ''}`}
              onChange={(_, val) => setSelectedProduct(val)}
              value={selectedProduct}
              renderInput={(params) => <TextField {...params} label="Choose product" />}
              sx={{ minWidth: 320 }}
            />
            <Button variant="outlined" startIcon={<AddIcon />} disabled={!selectedProduct} onClick={addBlankItem}>
              Add Line
            </Button>
          </Stack>

          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 260 }}>Variant</TableCell>
                <TableCell align="right" sx={{ width: 90 }}>Qty</TableCell>
                <TableCell align="right" sx={{ width: 140 }}>Unit Cost</TableCell>
                <TableCell sx={{ width: 200 }}>Item Discount</TableCell>
                <TableCell align="right" sx={{ width: 120 }}>Line</TableCell>
                <TableCell align="right" sx={{ width: 120 }}>Net</TableCell>
                <TableCell sx={{ width: 56 }} />
              </TableRow>
            </TableHead>
            <TableBody>
              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7}>
                    <Typography color="text.secondary" sx={{ py: 2 }}>
                      Add a line, pick a variant (filtered to the selected company), set qty/cost/discount.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}

              {items.map((row) => {
                const lineCalc = computeLine({
                  qty: Number(row.qty) || 0,
                  unit: Number(row.unitCost) || 0,
                  discount: row.discount && Number(row.discount.value) > 0 ? row.discount : undefined,
                });

                return (
                  <TableRow key={row.id}>
                    <TableCell>
                      <Autocomplete
                        loading={loadingVariants}
                        options={variantOptions}
                        getOptionLabel={(o) => `${o.size} / ${o.color} — ${o.companyName || ''}`}
                        value={variantOptions.find(v => v._id === row.variantId) || null}
                        onOpen={() => { if (selectedProduct?._id && companyId) loadVariants(selectedProduct._id, companyId); }}
                        onChange={(_, val) => updateItem(row.id, { variantId: val?._id || '', variantLabel: val ? `${val.size}/${val.color}` : '' })}
                        renderInput={(params) => <TextField {...params} label="Variant" />}
                        sx={{ minWidth: 240 }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <TextField type="number" value={row.qty} onChange={(e) => updateItem(row.id, { qty: Math.max(0, Number(e.target.value)) })} inputProps={{ min: 0, step: 1 }} size="small" />
                    </TableCell>
                    <TableCell align="right">
                      <TextField type="number" value={row.unitCost} onChange={(e) => updateItem(row.id, { unitCost: Math.max(0, Number(e.target.value)) })} inputProps={{ min: 0, step: '0.01' }} size="small" />
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        <Select size="small" value={row.discount?.mode || 'amount'} onChange={(e) => updateItem(row.id, { discount: { mode: e.target.value, value: Number(row.discount?.value || 0) } })} sx={{ width: 120 }}>
                          <MenuItem value="amount">amount</MenuItem>
                          <MenuItem value="percent">percent</MenuItem>
                        </Select>
                        <TextField size="small" type="number" value={row.discount?.value || 0} onChange={(e) => updateItem(row.id, { discount: { mode: row.discount?.mode || 'amount', value: Math.max(0, Number(e.target.value)) } })} inputProps={{ min: 0, step: '0.01' }} />
                      </Stack>
                    </TableCell>
                    <TableCell align="right">{(Number(row.qty || 0) * Number(row.unitCost || 0)).toFixed(2)}</TableCell>
                    <TableCell align="right">{lineCalc.net.toFixed(2)}</TableCell>
                    <TableCell align="center">
                      <IconButton color="error" onClick={() => removeItem(row.id)}><DeleteIcon /></IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          <Divider />

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <FormControl sx={{ minWidth: 160 }}>
              <InputLabel id="bill-discount-mode-label">Bill Discount</InputLabel>
              <Select labelId="bill-discount-mode-label" label="Bill Discount" value={billDiscount.mode} onChange={(e) => setBillDiscount((d) => ({ ...d, mode: e.target.value }))}>
                <MenuItem value="amount">amount</MenuItem>
                <MenuItem value="percent">percent</MenuItem>
              </Select>
            </FormControl>
            <TextField label="Bill Discount Value" type="number" value={billDiscount.value} onChange={(e) => setBillDiscount((d) => ({ ...d, value: Math.max(0, Number(e.target.value)) }))} inputProps={{ min: 0, step: '0.01' }} />
            <TextField label="Tax %" type="number" value={taxPercent} onChange={(e) => setTaxPercent(Math.max(0, Math.min(100, Number(e.target.value))))} inputProps={{ min: 0, max: 100, step: '0.01' }} />
          </Stack>

          <Box sx={{ textAlign: 'right' }}>
            <Typography>Item Subtotal: {totals.itemSubtotal.toFixed(2)}</Typography>
            <Typography>Item Discounts: −{totals.itemDiscountTotal.toFixed(2)}</Typography>
            <Typography>Bill Discount: −{totals.billDiscountTotal.toFixed(2)}</Typography>
            <Typography>Tax ({totals.taxPercent}%): {totals.taxTotal.toFixed(2)}</Typography>
            <Typography variant="h6">Grand Total: {totals.grandTotal.toFixed(2)}</Typography>
          </Box>

          <Stack direction="row" spacing={2} justifyContent="flex-end">
            <Button variant="outlined" onClick={() => { setItems([]); setSelectedProduct(null); setVariantOptions([]); setNote(''); setTaxPercent(0); setBillDiscount({ mode: 'amount', value: 0 }); }}>Reset</Button>
            <Button type="submit" variant="contained" disabled={submitting || !companyId}>{submitting ? 'Saving…' : 'Save Purchase Receipt'}</Button>
          </Stack>
        </Stack>
      </Box>

      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack((s) => ({ ...s, open: false }))}>
        <Alert onClose={() => setSnack((s) => ({ ...s, open: false }))} severity={snack.severity} variant="filled">{snack.message}</Alert>
      </Snackbar>
    </Paper>
  );
}


