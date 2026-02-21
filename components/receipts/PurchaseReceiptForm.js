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
  Box,
  Divider,
  Autocomplete,
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
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import { computeReceiptTotals, computeLine } from '@/lib/pricing';
import { useI18n } from '@/components/i18n/useI18n';
import ResponsiveActionsBar from '@/components/common/ResponsiveActionsBar';

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

export default function PurchaseReceiptForm({
  companies,
  mode = 'create', // 'create' | 'edit'
  receiptId,
  initialReceipt,
  readOnly = false,
}) {
  const router = useRouter();
  const { t, formatNumber } = useI18n();

  const initialCompanyId = initialReceipt?.companyId
    ? String(initialReceipt.companyId)
    : companies[0]?._id || '';

  const [companyId, setCompanyId] = React.useState(initialCompanyId);
  const [status, setStatus] = React.useState(initialReceipt?.status || 'ordered');
  const [note, setNote] = React.useState(initialReceipt?.note || '');
  const [taxPercent, setTaxPercent] = React.useState(Number(initialReceipt?.taxPercent || 0));
  const [billDiscount, setBillDiscount] = React.useState(
    initialReceipt?.billDiscount
      ? {
          mode: initialReceipt.billDiscount.mode,
          value: Number(initialReceipt.billDiscount.value || 0),
        }
      : { mode: 'amount', value: 0 },
  );

  const [productQuery, setProductQuery] = React.useState('');
  const [productOptions, setProductOptions] = React.useState([]);
  const [loadingProducts, setLoadingProducts] = React.useState(false);

  const [selectedProduct, setSelectedProduct] = React.useState(null);
  const [variantOptions, setVariantOptions] = React.useState([]);
  const [extraVariantOptions, setExtraVariantOptions] = React.useState([]);
  const [loadingVariants, setLoadingVariants] = React.useState(false);
  const [selectedSizes, setSelectedSizes] = React.useState([]);
  const [selectedColors, setSelectedColors] = React.useState([]);

  const mergeVariantsById = React.useCallback((...lists) => {
    const m = new Map();
    for (const list of lists) {
      for (const v of list || []) {
        const id = String(v?._id || '');
        if (!id) continue;
        m.set(id, v);
      }
    }
    return Array.from(m.values()).filter((v) => v && v._id);
  }, []);

  const [items, setItems] = React.useState(() => {
    const src = Array.isArray(initialReceipt?.items) ? initialReceipt.items : [];
    if (!src.length) return [];
    return src.map((it) => ({
      id: crypto.randomUUID(),
      // Local-only grouping field (not submitted)
      productId: '',
      variantId: String(it?.variantId || ''),
      qty: Number(it?.qty || 0),
      unitCost: Number(it?.unitCost || 0),
      discount: it?.discount
        ? { mode: it.discount.mode, value: Number(it.discount.value || 0) }
        : { mode: 'amount', value: 0 },
      snapshot: it?.snapshot || null,
    }));
  });

  React.useEffect(() => {
    // Make sure the current (loaded) variants are selectable even if the user hasn't loaded the product variants list.
    const src = Array.isArray(initialReceipt?.items) ? initialReceipt.items : [];
    const placeholders = src
      .map((it) => {
        const id = String(it?.variantId || '');
        if (!id) return null;
        const size = String(it?.snapshot?.size || '');
        const color = String(it?.snapshot?.color || '');
        return { _id: id, size, color, companyName: '' };
      })
      .filter(Boolean);
    // Merge placeholders (fallback) without wiping cached variants.
    setExtraVariantOptions((prev) => mergeVariantsById(placeholders, prev));
  }, [initialReceipt, mergeVariantsById]);

  const allVariantOptions = React.useMemo(() => {
    // extraVariantOptions keeps variants already used in receipt lines across products.
    // variantOptions is for the currently selected product and should override placeholders.
    return mergeVariantsById(extraVariantOptions, variantOptions);
  }, [variantOptions, extraVariantOptions, mergeVariantsById]);

  React.useEffect(() => {
    const tt = setTimeout(async () => {
      setLoadingProducts(true);
      try {
        const json = await searchProducts({ query: productQuery });
        setProductOptions(json.items || []);
      } finally {
        setLoadingProducts(false);
      }
    }, 400);
    return () => clearTimeout(tt);
  }, [productQuery]);

  async function loadVariants(productId, companyId2) {
    if (!productId) return setVariantOptions([]);
    setLoadingVariants(true);
    try {
      const res = await fetch(`/api/products/${productId}/variants?companyId=${companyId2}`, {
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

  React.useEffect(() => {
    // When product/company changes, reset generator filters
    setSelectedSizes([]);
    setSelectedColors([]);
  }, [selectedProduct?._id, companyId]);

  const availableSizes = React.useMemo(() => {
    const s = new Set();
    for (const v of variantOptions || []) {
      if (v?.size) s.add(String(v.size));
    }
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [variantOptions]);

  const availableColors = React.useMemo(() => {
    const s = new Set();
    for (const v of variantOptions || []) {
      if (v?.color) s.add(String(v.color));
    }
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [variantOptions]);

  const matchingVariants = React.useMemo(() => {
    const sizesSet = new Set(selectedSizes || []);
    const colorsSet = new Set(selectedColors || []);
    return (variantOptions || []).filter((v) => {
      const okSize = (selectedSizes || []).length === 0 || sizesSet.has(String(v?.size || ''));
      const okColor = (selectedColors || []).length === 0 || colorsSet.has(String(v?.color || ''));
      return okSize && okColor;
    });
  }, [variantOptions, selectedSizes, selectedColors]);

  const preview = React.useMemo(() => {
    const limit = 10;
    const rows = (matchingVariants || []).slice(0, limit).map((v) => ({
      size: String(v?.size || ''),
      color: String(v?.color || ''),
    }));
    return { rows, total: (matchingVariants || []).length, limit };
  }, [matchingVariants]);

  const addBlankItem = () => {
    setItems((arr) => [
      ...(arr || []),
      {
        id: crypto.randomUUID(),
        // Group this new row under the currently selected product.
        productId: String(selectedProduct?._id || ''),
        variantId: '',
        qty: 1,
        unitCost: 0,
        discount: { mode: 'amount', value: 0 },
        snapshot: selectedProduct
          ? {
              productCode: String(selectedProduct.code || ''),
              productName: String(selectedProduct.localCode || ''),
              size: '',
              color: '',
            }
          : null,
      },
    ]);
  };

  const generateLines = React.useCallback(() => {
    setItems((arr) => {
      const existing = new Set((arr || []).map((x) => String(x?.variantId || '')).filter(Boolean));
      const toAdd = [];
      for (const v of matchingVariants || []) {
        const variantId = String(v?._id || '');
        if (!variantId || existing.has(variantId)) continue;
        toAdd.push({
          id: crypto.randomUUID(),
          productId: String(v?.productId || selectedProduct?._id || ''),
          variantId,
          qty: 1,
          unitCost: 0,
          discount: { mode: 'amount', value: 0 },
          snapshot: {
            productCode: String(selectedProduct?.code || ''),
            productName: String(selectedProduct?.localCode || ''),
            size: v?.size || '',
            color: v?.color || '',
          },
        });
        existing.add(variantId);
      }
      return [...(arr || []), ...toAdd];
    });

    // Cache generated variants so switching the generator product doesn't blank existing lines.
    setExtraVariantOptions((prev) => mergeVariantsById(prev, matchingVariants));

    // After generating, reset the generator inputs so new batches can be generated
    // without affecting already-generated receipt lines.
    setSelectedSizes([]);
    setSelectedColors([]);
  }, [
    matchingVariants,
    mergeVariantsById,
    selectedProduct?._id,
    selectedProduct?.code,
    selectedProduct?.localCode,
  ]);

  const removeItem = (id) => setItems((arr) => (arr || []).filter((x) => x.id !== id));
  const updateItem = (id, patch) =>
    setItems((arr) => (arr || []).map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const [collapsedByProduct, setCollapsedByProduct] = React.useState({});

  const variantById = React.useMemo(() => {
    const m = new Map();
    for (const v of allVariantOptions || []) m.set(String(v?._id || ''), v);
    return m;
  }, [allVariantOptions]);

  const groupedItems = React.useMemo(() => {
    const groups = new Map();
    const order = [];

    for (const row of items || []) {
      const variantId = String(row?.variantId || '');
      const v = variantId ? variantById.get(variantId) : null;
      const productId = String(row?.productId || v?.productId || '');
      const snapCode = String(row?.snapshot?.productCode || '');
      const key = productId
        ? `product:${productId}`
        : snapCode
          ? `code:${snapCode}`
          : 'unassigned';

      if (!groups.has(key)) {
        groups.set(key, { key, productId, rows: [] });
        order.push(key);
      }
      groups.get(key).rows.push(row);
    }

    return order.map((k) => groups.get(k));
  }, [items, variantById]);

  const pricingPayload = React.useMemo(
    () => ({
      type: 'purchase',
      items: (items || []).map((it) => ({
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

  const [snack, setSnack] = React.useState({ open: false, severity: 'success', message: '' });
  const [submitting, setSubmitting] = React.useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    if (readOnly) return;
    if (!companyId) {
      setSnack({ open: true, severity: 'error', message: t('errors.selectCompany') });
      return;
    }
    const itemsToSubmit = (items || []).filter((it) => Number(it.qty) > 0);
    if (itemsToSubmit.length === 0) {
      setSnack({ open: true, severity: 'error', message: t('errors.addAtLeastOneLine') });
      return;
    }
    if (itemsToSubmit.some((it) => !it.variantId)) {
      setSnack({ open: true, severity: 'error', message: t('errors.chooseVariantEach') });
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        type: 'purchase',
        ...(mode === 'create' ? { status } : {}),
        companyId,
        items: itemsToSubmit.map((it) => ({
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

      const res =
        mode === 'create'
          ? await fetch('/api/receipts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            })
          : await fetch(`/api/receipts/${receiptId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || json?.error || t('errors.saveFailed'));

      if (mode === 'create') {
        setSnack({
          open: true,
          severity: 'success',
          message: `${t('success.receiptCreatedTotal')} ${formatNumber(json.totals.grandTotal, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        });
        // After save, return to purchases list
        setTimeout(() => router.push('/receipts'), 250);
      } else {
        setSnack({ open: true, severity: 'success', message: t('common.saved') });
        // After save, return to purchases list
        setTimeout(() => router.push('/receipts'), 250);
      }
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
                disabled={readOnly}
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
                disabled={readOnly || mode !== 'create'}
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
              disabled={readOnly}
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
              disabled={readOnly}
            />
            <Autocomplete
              loading={loadingProducts}
              options={productOptions}
              getOptionLabel={(o) => o?.code || ''}
              onChange={(_, val) => setSelectedProduct(val)}
              value={selectedProduct}
              renderInput={(params) => (
                <TextField {...params} label={t('purchase.chooseProduct')} />
              )}
              sx={{ minWidth: 320 }}
              disabled={readOnly}
            />
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              disabled={!selectedProduct || readOnly}
              onClick={addBlankItem}
            >
              {t('purchase.addLine')}
            </Button>
          </Stack>

          {/* Variant generator */}
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack spacing={1.5}>
              <Typography variant="subtitle1">{t('purchase.variantGenerator')}</Typography>
              <Typography variant="body2" color="text.secondary">
                {t('purchase.linesQtyZeroHint')}
              </Typography>

              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <Autocomplete
                  multiple
                  options={availableSizes}
                  value={selectedSizes}
                  onChange={(_, newVal) => setSelectedSizes(newVal)}
                  disabled={
                    readOnly || !selectedProduct || loadingVariants || availableSizes.length === 0
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label={t('products.sizes')}
                      placeholder={availableSizes.length ? '' : t('common.loading')}
                      fullWidth
                    />
                  )}
                  sx={{ flex: 1, minWidth: 0 }}
                />
                <Autocomplete
                  multiple
                  options={availableColors}
                  value={selectedColors}
                  onChange={(_, newVal) => setSelectedColors(newVal)}
                  disabled={
                    readOnly || !selectedProduct || loadingVariants || availableColors.length === 0
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label={t('products.colors')}
                      placeholder={availableColors.length ? '' : t('common.loading')}
                      fullWidth
                    />
                  )}
                  sx={{ flex: 1, minWidth: 0 }}
                />
                <Button
                  variant="contained"
                  disabled={readOnly || !selectedProduct || loadingVariants || preview.total === 0}
                  onClick={generateLines}
                >
                  {t('purchase.generateLines')}
                </Button>
              </Stack>

              <Typography variant="subtitle2" sx={{ mt: 0.5 }}>
                {t('products.variantPreview')} ({preview.total} {t('common.total')})
              </Typography>
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small" sx={{ minWidth: 360 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>{t('products.size')}</TableCell>
                      <TableCell>{t('products.color')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {preview.rows.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell>{r.size}</TableCell>
                        <TableCell>{r.color}</TableCell>
                      </TableRow>
                    ))}
                    {preview.total > preview.rows.length && (
                      <TableRow>
                        <TableCell colSpan={2}>
                          …{t('common.and')} {preview.total - preview.rows.length}{' '}
                          {t('common.more')}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Box>
            </Stack>
          </Paper>

          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: 720 }}>
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

                {groupedItems.map((group) => {
                  const expanded = collapsedByProduct[group.key] !== true;

                  const groupTotals = group.rows.reduce(
                    (acc, row) => {
                      const qty = Number(row?.qty) || 0;
                      const unitCost = Number(row?.unitCost) || 0;
                      const line = qty * unitCost;
                      const lineCalc = computeLine({
                        qty,
                        unit: unitCost,
                        discount:
                          row.discount && Number(row.discount.value) > 0 ? row.discount : undefined,
                      });
                      return {
                        qty: acc.qty + qty,
                        line: acc.line + line,
                        net: acc.net + Number(lineCalc.net || 0),
                      };
                    },
                    { qty: 0, line: 0, net: 0 },
                  );

                  const snap =
                    group.rows.find((r) => r?.snapshot?.productCode || r?.snapshot?.productName)
                      ?.snapshot || null;
                  const label = snap?.productCode
                    ? `${snap.productCode}`
                    : group.productId
                      ? `${t('common.product')} ${group.productId}`
                      : t('common.product');

                  const unitCosts = group.rows.map((r) => Number(r?.unitCost) || 0);
                  const firstUnitCost = unitCosts[0] ?? 0;
                  const mixedUnitCost = unitCosts.some((v) => v !== firstUnitCost);
                  const groupUnitCostValue = mixedUnitCost ? '' : firstUnitCost;
                  const groupRowIdSet = new Set(group.rows.map((r) => r.id));

                  const toggle = () =>
                    setCollapsedByProduct((prev) => ({ ...prev, [group.key]: !prev[group.key] }));

                  return (
                    <React.Fragment key={group.key}>
                      <TableRow
                        hover
                        onClick={toggle}
                        sx={{ cursor: 'pointer', bgcolor: 'action.hover' }}
                      >
                        <TableCell>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggle();
                              }}
                            >
                              {expanded ? <KeyboardArrowDownIcon /> : <KeyboardArrowRightIcon />}
                            </IconButton>
                            <Typography variant="subtitle2">{label}</Typography>
                            <Typography variant="body2" color="text.secondary">
                              ({group.rows.length})
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell align="right">{groupTotals.qty}</TableCell>
                        <TableCell align="right">
                          <TextField
                            size="small"
                            type="number"
                            value={groupUnitCostValue}
                            placeholder={mixedUnitCost ? '—' : ''}
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              const raw = e.target.value;
                              const next = raw === '' ? 0 : Number(raw);
                              if (Number.isNaN(next)) return;
                              setItems((arr) =>
                                (arr || []).map((row) =>
                                  groupRowIdSet.has(row.id)
                                    ? { ...row, unitCost: Math.max(0, next) }
                                    : row,
                                ),
                              );
                            }}
                            inputProps={{
                              min: 0,
                              step: '0.01',
                              style: { textAlign: 'right' },
                            }}
                            sx={{ width: 120 }}
                            disabled={readOnly}
                          />
                        </TableCell>
                        <TableCell />
                        <TableCell align="right">
                          {formatNumber(groupTotals.line, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </TableCell>
                        <TableCell align="right">
                          {formatNumber(groupTotals.net, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </TableCell>
                        <TableCell />
                      </TableRow>

                      {expanded &&
                        group.rows.map((row) => {
                          const lineCalc = computeLine({
                            qty: Number(row.qty) || 0,
                            unit: Number(row.unitCost) || 0,
                            discount:
                              row.discount && Number(row.discount.value) > 0
                                ? row.discount
                                : undefined,
                          });

                          return (
                            <TableRow key={row.id}>
                              <TableCell sx={{ pl: 6 }}>
                                <Autocomplete
                                  loading={loadingVariants}
                                  options={allVariantOptions}
                                  isOptionEqualToValue={(a, b) =>
                                    String(a?._id || '') === String(b?._id || '')
                                  }
                                  getOptionLabel={(o) =>
                                    `${o.size} / ${o.color} — ${o.companyName || ''}`
                                  }
                                  value={
                                    allVariantOptions.find(
                                      (v) => String(v._id) === String(row.variantId),
                                    ) || null
                                  }
                                  onOpen={() => {
                                    if (selectedProduct?._id && companyId)
                                      loadVariants(selectedProduct._id, companyId);
                                  }}
                                  onChange={(_, val) => {
                                    updateItem(row.id, {
                                      variantId: String(val?._id || ''),
                                      productId: String(val?.productId || row.productId || ''),
                                      snapshot: val
                                        ? {
                                            ...(row.snapshot || {}),
                                            size: val?.size || '',
                                            color: val?.color || '',
                                          }
                                        : row.snapshot
                                          ? { ...row.snapshot, size: '', color: '' }
                                          : null,
                                    });
                                    if (val?._id) {
                                      // Cache manually selected variants so they remain visible after switching products.
                                      setExtraVariantOptions((prev) =>
                                        mergeVariantsById(prev, [val]),
                                      );
                                    }
                                  }}
                                  renderInput={(params) => (
                                    <TextField {...params} label={t('common.variant')} />
                                  )}
                                  sx={{ minWidth: 240 }}
                                  disabled={readOnly}
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
                                  disabled={readOnly}
                                />
                              </TableCell>
                              <TableCell align="right">
                                <TextField
                                  type="number"
                                  value={row.unitCost}
                                  onChange={(e) =>
                                    updateItem(row.id, {
                                      unitCost: Math.max(0, Number(e.target.value)),
                                    })
                                  }
                                  inputProps={{ min: 0, step: '0.01' }}
                                  size="small"
                                  disabled={readOnly}
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
                                    disabled={readOnly}
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
                                    disabled={readOnly}
                                  />
                                </Stack>
                              </TableCell>
                              <TableCell align="right">
                                {formatNumber(Number(row.qty || 0) * Number(row.unitCost || 0), {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </TableCell>
                              <TableCell align="right">
                                {formatNumber(lineCalc.net, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </TableCell>
                              <TableCell align="center">
                                <IconButton
                                  color="error"
                                  onClick={() => removeItem(row.id)}
                                  disabled={readOnly}
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </Box>

          <Divider />

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <FormControl sx={{ minWidth: 160 }}>
              <InputLabel id="bill-discount-mode-label">{t('checkout.billDiscount')}</InputLabel>
              <Select
                labelId="bill-discount-mode-label"
                label={t('checkout.billDiscount')}
                value={billDiscount.mode}
                onChange={(e) => setBillDiscount((d) => ({ ...d, mode: e.target.value }))}
                disabled={readOnly}
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
              disabled={readOnly}
            />
            <TextField
              label={t('checkout.taxPercent')}
              type="number"
              value={taxPercent}
              onChange={(e) => setTaxPercent(Math.max(0, Math.min(100, Number(e.target.value))))}
              inputProps={{ min: 0, max: 100, step: '0.01' }}
              disabled={readOnly}
            />
          </Stack>

          <Box sx={{ textAlign: 'end' }}>
            <Typography>
              {t('receipt.subtotal')}:{' '}
              {formatNumber(totals.itemSubtotal, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Typography>
            <Typography>
              {t('receipt.itemDiscounts')}: −
              {formatNumber(totals.itemDiscountTotal, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Typography>
            <Typography>
              {t('receipt.billDiscount')}: −
              {formatNumber(totals.billDiscountTotal, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Typography>
            <Typography>
              {t('receipt.tax')} ({formatNumber(totals.taxPercent)}%):{' '}
              {formatNumber(totals.taxTotal, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Typography>
            <Typography variant="h6">
              {t('receipt.grandTotal')}:{' '}
              {formatNumber(totals.grandTotal, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Typography>
          </Box>

          <ResponsiveActionsBar>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="flex-end">
              <Button
                variant="outlined"
                onClick={() => {
                  if (readOnly) return;
                  setItems([]);
                  setSelectedProduct(null);
                  setVariantOptions([]);
                  setExtraVariantOptions([]);
                  setCollapsedByProduct({});
                  setNote('');
                  setStatus('ordered');
                  setTaxPercent(0);
                  setBillDiscount({ mode: 'amount', value: 0 });
                }}
                disabled={readOnly}
              >
                {t('common.reset')}
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={readOnly || submitting || !companyId}
              >
                {submitting
                  ? t('common.saving')
                  : mode === 'create'
                    ? t('purchase.saveReceipt')
                    : t('common.save')}
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
