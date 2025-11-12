'use client';

import * as React from 'react';
import {
  Paper,
  Stack,
  TextField,
  Button,
  Typography,
  MenuItem,
  Box,
  Divider,
  Autocomplete,
  Chip,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
  InputAdornment,
  Snackbar,
  Alert,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import { computeReceiptTotals, computeLine } from '@/lib/pricing';
import { useI18n } from '@/components/i18n/useI18n';

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
  const { t, formatNumber } = useI18n();
  const [companyId, setCompanyId] = React.useState(companies[0]?._id || '');
  const [status, setStatus] = React.useState('ordered');
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
      const res = await fetch(`/api/products/${productId}/variants?companyId=${companyId}`, {
        cache: 'no-store',
      });
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
      {
        id: crypto.randomUUID(),
        variantId: '',
        variantLabel: '',
        qty: 1,
        unitCost: 0,
        discount: { mode: 'amount', value: 0 },
      },
    ]);
  };

  const removeItem = (id) => setItems((arr) => arr.filter((x) => x.id !== id));
  const updateItem = (id, patch) =>
    setItems((arr) => arr.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const pricingPayload = React.useMemo(
    () => ({
      type: 'purchase',
      items: items.map((it) => ({
        qty: Number(it.qty) || 0,
        unitCost: Number(it.unitCost) || 0,
        discount:
          it.discount && Number(it.discount.value) > 0
            ? { mode: it.discount.mode, value: Number(it.discount.value) }
            : undefined,
      })),
      billDiscount:
        billDiscount && Number(billDiscount.value) > 0
          ? { mode: billDiscount.mode, value: Number(billDiscount.value) }
          : undefined,
      taxPercent: Number(taxPercent) || 0,
    }),
    [items, billDiscount, taxPercent],
  );

  const { totals } = computeReceiptTotals(pricingPayload);

  async function onSubmit(e) {
    e.preventDefault();
    if (!companyId) {
      setSnack({ open: true, severity: 'error', message: t('errors.selectCompany') });
      return;
    }
    if (items.length === 0) {
      setSnack({ open: true, severity: 'error', message: t('errors.addAtLeastOneLine') });
      return;
    }
    if (items.some((it) => !it.variantId)) {
      setSnack({ open: true, severity: 'error', message: t('errors.chooseVariantEach') });
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        type: 'purchase',
        status,
        companyId,
        items: items.map((it) => ({
          variantId: it.variantId,
          qty: Number(it.qty) || 0,
          unitCost: Number(it.unitCost) || 0,
          discount:
            it.discount && Number(it.discount.value) > 0
              ? { mode: it.discount.mode, value: Number(it.discount.value) }
              : undefined,
        })),
        billDiscount:
          billDiscount && Number(billDiscount.value) > 0
            ? { mode: billDiscount.mode, value: Number(billDiscount.value) }
            : undefined,
        taxPercent: Number(taxPercent) || 0,
        note: note || undefined,
      };

      const res = await fetch('/api/receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(t('errors.createReceiptFailed'));
      setSnack({
        open: true,
        severity: 'success',
        message: `${t('success.receiptCreatedTotal')} ${formatNumber(json.totals.grandTotal, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      });
      setItems([]);
      setSelectedProduct(null);
      setVariantOptions([]);
      setNote('');
      setStatus('ordered');
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
      <Typography variant="h5" gutterBottom>
        {t('purchase.title')}
      </Typography>

      <Box component="form" onSubmit={onSubmit}>
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <FormControl fullWidth>
              <InputLabel id="company-label">{t('purchase.company')}</InputLabel>
              <Select
                labelId="company-label"
                label={t('purchase.company')}
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                required
              >
                {companies.map((c) => (
                  <MenuItem key={c._id} value={c._id}>
                    {c.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel id="status-label">{t('common.status')}</InputLabel>
              <Select
                labelId="status-label"
                label={t('common.status')}
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <MenuItem value="ordered">{t('status.ordered')}</MenuItem>
                <MenuItem value="on_delivery">{t('status.on_delivery')}</MenuItem>
                <MenuItem value="completed">{t('status.completed')}</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label={t('common.note')}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              fullWidth
            />
          </Stack>

          <Divider />

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              label={t('purchase.searchProduct')}
              placeholder={t('purchase.searchProductPlaceholder')}
              value={productQuery}
              onChange={(e) => setProductQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              fullWidth
            />
            <Autocomplete
              loading={loadingProducts}
              options={productOptions}
              getOptionLabel={(o) => `${o.code}${o.name ? ' — ' + o.name : ''}`}
              onChange={(_, val) => setSelectedProduct(val)}
              value={selectedProduct}
              renderInput={(params) => <TextField {...params} label={t('purchase.chooseProduct')} />}
              sx={{ minWidth: 320 }}
            />
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              disabled={!selectedProduct}
              onClick={addBlankItem}
            >
              {t('purchase.addLine')}
            </Button>
          </Stack>

          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 260 }}>{t('common.variant')}</TableCell>
                <TableCell align="right" sx={{ width: 90 }}>
                  {t('common.qty')}
                </TableCell>
                <TableCell align="right" sx={{ width: 140 }}>
                  {t('purchase.unitCost')}
                </TableCell>
                <TableCell sx={{ width: 200 }}>{t('purchase.itemDiscount')}</TableCell>
                <TableCell align="right" sx={{ width: 120 }}>
                  {t('cart.line')}
                </TableCell>
                <TableCell align="right" sx={{ width: 120 }}>
                  {t('receipt.net')}
                </TableCell>
                <TableCell sx={{ width: 56 }} />
              </TableRow>
            </TableHead>
            <TableBody>
              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7}>
                    <Typography color="text.secondary" sx={{ py: 2 }}>
                      {t('purchase.emptyLines')}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}

              {items.map((row) => {
                const lineCalc = computeLine({
                  qty: Number(row.qty) || 0,
                  unit: Number(row.unitCost) || 0,
                  discount:
                    row.discount && Number(row.discount.value) > 0 ? row.discount : undefined,
                });

                return (
                  <TableRow key={row.id}>
                    <TableCell>
                      <Autocomplete
                        loading={loadingVariants}
                        options={variantOptions}
                        getOptionLabel={(o) => `${o.size} / ${o.color} — ${o.companyName || ''}`}
                        value={variantOptions.find((v) => v._id === row.variantId) || null}
                        onOpen={() => {
                          if (selectedProduct?._id && companyId)
                            loadVariants(selectedProduct._id, companyId);
                        }}
                        onChange={(_, val) =>
                          updateItem(row.id, {
                            variantId: val?._id || '',
                            variantLabel: val ? `${val.size}/${val.color}` : '',
                          })
                        }
                        renderInput={(params) => <TextField {...params} label={t('common.variant')} />}
                        sx={{ minWidth: 240 }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <TextField
                        type="number"
                        value={row.qty}
                        onChange={(e) =>
                          updateItem(row.id, { qty: Math.max(0, Number(e.target.value)) })
                        }
                        inputProps={{ min: 0, step: 1 }}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <TextField
                        type="number"
                        value={row.unitCost}
                        onChange={(e) =>
                          updateItem(row.id, { unitCost: Math.max(0, Number(e.target.value)) })
                        }
                        inputProps={{ min: 0, step: '0.01' }}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        <Select
                          size="small"
                          value={row.discount?.mode || 'amount'}
                          onChange={(e) =>
                            updateItem(row.id, {
                              discount: {
                                mode: e.target.value,
                                value: Number(row.discount?.value || 0),
                              },
                            })
                          }
                          sx={{ width: 120 }}
                        >
                          <MenuItem value="amount">{t('discount.amount')}</MenuItem>
                          <MenuItem value="percent">{t('discount.percent')}</MenuItem>
                        </Select>
                        <TextField
                          size="small"
                          type="number"
                          value={row.discount?.value || 0}
                          onChange={(e) =>
                            updateItem(row.id, {
                              discount: {
                                mode: row.discount?.mode || 'amount',
                                value: Math.max(0, Number(e.target.value)),
                              },
                            })
                          }
                          inputProps={{ min: 0, step: '0.01' }}
                        />
                      </Stack>
                    </TableCell>
                    <TableCell align="right">
                      {formatNumber((Number(row.qty || 0) * Number(row.unitCost || 0)), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell align="right">{formatNumber(lineCalc.net, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                    <TableCell align="center">
                      <IconButton color="error" onClick={() => removeItem(row.id)}>
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          <Divider />

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <FormControl sx={{ minWidth: 160 }}>
              <InputLabel id="bill-discount-mode-label">{t('checkout.billDiscount')}</InputLabel>
              <Select
                labelId="bill-discount-mode-label"
                label={t('checkout.billDiscount')}
                value={billDiscount.mode}
                onChange={(e) => setBillDiscount((d) => ({ ...d, mode: e.target.value }))}
              >
                <MenuItem value="amount">{t('discount.amount')}</MenuItem>
                <MenuItem value="percent">{t('discount.percent')}</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label={t('purchase.billDiscountValue')}
              type="number"
              value={billDiscount.value}
              onChange={(e) =>
                setBillDiscount((d) => ({ ...d, value: Math.max(0, Number(e.target.value)) }))
              }
              inputProps={{ min: 0, step: '0.01' }}
            />
            <TextField
              label={t('checkout.taxPercent')}
              type="number"
              value={taxPercent}
              onChange={(e) => setTaxPercent(Math.max(0, Math.min(100, Number(e.target.value))))}
              inputProps={{ min: 0, max: 100, step: '0.01' }}
            />
          </Stack>

          <Box sx={{ textAlign: 'right' }}>
            <Typography>{t('receipt.subtotal')}: {formatNumber(totals.itemSubtotal, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
            <Typography>{t('receipt.itemDiscounts')}: −{formatNumber(totals.itemDiscountTotal, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
            <Typography>{t('receipt.billDiscount')}: −{formatNumber(totals.billDiscountTotal, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
            <Typography>
              {t('receipt.tax')} ({formatNumber(totals.taxPercent)}%): {formatNumber(totals.taxTotal, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Typography>
            <Typography variant="h6">{t('receipt.grandTotal')}: {formatNumber(totals.grandTotal, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
          </Box>

          <Stack direction="row" spacing={2} justifyContent="flex-end">
            <Button
              variant="outlined"
              onClick={() => {
                setItems([]);
                setSelectedProduct(null);
                setVariantOptions([]);
                setNote('');
                setStatus('ordered');
                setTaxPercent(0);
                setBillDiscount({ mode: 'amount', value: 0 });
              }}
            >
              {t('common.reset')}
            </Button>
            <Button type="submit" variant="contained" disabled={submitting || !companyId}>
              {submitting ? t('common.saving') : t('purchase.saveReceipt')}
            </Button>
          </Stack>
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
