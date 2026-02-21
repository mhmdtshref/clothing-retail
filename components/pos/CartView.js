'use client';

import * as React from 'react';
import {
  Box,
  Stack,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
  TextField,
  Select,
  MenuItem,
  Button,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import { computeLine, computeReceiptTotals } from '@/lib/pricing';
import { useI18n } from '@/components/i18n/useI18n';

export default function CartView({
  items,
  inc,
  dec,
  setQty,
  setUnitPrice,
  setDiscount,
  removeLine,
  clear,
  billDiscount,
  setBillDiscount,
  taxPercent,
  setTaxPercent,
  selectedLineId: selectedLineIdProp,
  onSelectLineId: onSelectLineIdProp,
  showEditor = true,
  showTotals = true,
  showBillDiscountControls = true,
  showTaxPercent = true,
  scrollTable = false,
  disableBottomPadding = false,
}) {
  const { t, formatNumber } = useI18n();
  // Allow selection to be controlled by a parent (e.g. POS page sidebar editor).
  const [selectedLineIdInternal, setSelectedLineIdInternal] = React.useState(null);
  const selectedLineId = selectedLineIdProp ?? selectedLineIdInternal;
  const onSelectLineId = onSelectLineIdProp ?? setSelectedLineIdInternal;

  React.useEffect(() => {
    if (selectedLineId && !items.some((l) => l.id === selectedLineId)) {
      onSelectLineId(null);
    }
  }, [items, selectedLineId, onSelectLineId]);

  const handleRemoveLine = React.useCallback(
    (id) => {
      removeLine(id);
      if (id === selectedLineId) onSelectLineId(null);
    },
    [removeLine, selectedLineId, onSelectLineId],
  );

  const selectedLine = React.useMemo(
    () => items.find((l) => l.id === selectedLineId) || null,
    [items, selectedLineId],
  );

  const [qtyDialogOpen, setQtyDialogOpen] = React.useState(false);
  const [priceDialogOpen, setPriceDialogOpen] = React.useState(false);
  const [qtyDraft, setQtyDraft] = React.useState('');
  const [priceDraft, setPriceDraft] = React.useState('');

  const openQtyDialog = React.useCallback(() => {
    if (!selectedLine) return;
    setQtyDraft(String(Math.max(0, Math.floor(Number(selectedLine.qty) || 0))));
    setQtyDialogOpen(true);
  }, [selectedLine]);

  const openPriceDialog = React.useCallback(() => {
    if (!selectedLine) return;
    setPriceDraft(String(Math.max(0, Number(selectedLine.unitPrice) || 0)));
    setPriceDialogOpen(true);
  }, [selectedLine]);

  const closeQtyDialog = React.useCallback(() => setQtyDialogOpen(false), []);
  const closePriceDialog = React.useCallback(() => setPriceDialogOpen(false), []);

  const saveQty = React.useCallback(() => {
    if (!selectedLine) return;
    setQty(selectedLine.id, Math.max(0, Math.floor(Number(qtyDraft) || 0)));
    setQtyDialogOpen(false);
  }, [selectedLine, qtyDraft, setQty]);

  const savePrice = React.useCallback(() => {
    if (!selectedLine) return;
    setUnitPrice(selectedLine.id, Math.max(0, Number(priceDraft) || 0));
    setPriceDialogOpen(false);
  }, [selectedLine, priceDraft, setUnitPrice]);

  const pricingPayload = React.useMemo(
    () => ({
      type: 'sale',
      items: items.map((l) => ({
        qty: Number(l.qty) || 0,
        unitPrice: Number(l.unitPrice) || 0,
        discount: l.discount && Number(l.discount.value) > 0 ? l.discount : undefined,
      })),
      billDiscount: billDiscount && Number(billDiscount.value) > 0 ? billDiscount : undefined,
      taxPercent: Number(taxPercent) || 0,
    }),
    [items, billDiscount, taxPercent],
  );

  const { totals } = computeReceiptTotals(pricingPayload);

  return (
    <Stack
      spacing={2}
      sx={{
        pb: disableBottomPadding ? 0 : { xs: showTotals ? '96px' : '140px', sm: 0 },
        ...(scrollTable ? { flex: 1, minHeight: 0 } : null),
      }}
    >
      {showEditor ? (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 260px' },
            // Mobile: editor above table. Desktop: editor on the right.
            gridTemplateAreas: { xs: '"editor" "table"', md: '"table editor"' },
            gap: 2,
            alignItems: 'start',
          }}
        >
          {/* Editor sidebar */}
          <Box
            sx={{
              gridArea: 'editor',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
              p: 1.5,
              position: { md: 'sticky' },
              top: { md: 8 },
            }}
          >
            <Stack spacing={1}>
              <Button
                fullWidth
                variant="contained"
                onClick={openQtyDialog}
                disabled={!selectedLine}
              >
                {t('common.qty')}
              </Button>
              <Button
                fullWidth
                variant="outlined"
                onClick={openPriceDialog}
                disabled={!selectedLine}
              >
                {t('pos.unitPrice')}
              </Button>
            </Stack>
          </Box>

          {/* Cart table */}
          <Box sx={{ width: '100%', overflowX: 'hidden', gridArea: 'table' }}>
            <Table
              size="small"
              stickyHeader
              sx={{
                width: '100%',
                tableLayout: 'fixed',
              }}
            >
              <TableHead>
                <TableRow>
                  <TableCell>{t('common.product')}</TableCell>
                  <TableCell align="right" sx={{ width: 72 }}>
                    {t('common.qty')}
                  </TableCell>
                  <TableCell align="right" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                    {t('pos.unitPrice')}
                  </TableCell>
                  <TableCell align="right" sx={{ width: 96 }}>
                    {t('cart.lineTotal')}
                  </TableCell>
                  <TableCell align="right" sx={{ width: 64 }}>
                    {t('common.actions')}
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <Typography color="text.secondary" sx={{ py: 2 }}>
                        {t('cart.empty')}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
                {items.map((l) => {
                  const { net } = computeLine({
                    qty: l.qty,
                    unit: l.unitPrice,
                    discount: l.discount,
                  });
                  return (
                    <TableRow
                      key={l.id}
                      hover
                      selected={selectedLineId === l.id}
                      onClick={() => onSelectLineId(l.id)}
                      sx={{
                        cursor: 'pointer',
                        '&.Mui-selected': { bgcolor: 'action.selected' },
                        '&.Mui-selected:hover': { bgcolor: 'action.selected' },
                      }}
                    >
                      <TableCell sx={{ overflow: 'hidden' }}>
                        <Typography fontWeight={600} noWrap title={l.code}>
                          {l.code}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: 'block' }}
                        >
                          {l.size} / {l.color} • {l.companyName}
                        </Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ width: 72 }}>
                        <Typography fontWeight={600}>{formatNumber(l.qty)}</Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                        {formatNumber(l.unitPrice, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell align="right">
                        {formatNumber(net, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          color="error"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveLine(l.id);
                          }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Box>
        </Box>
      ) : (
        <Box
          sx={{
            width: '100%',
            overflowX: 'hidden',
            ...(scrollTable ? { flex: 1, minHeight: 0, overflowY: 'auto' } : null),
          }}
        >
          <Table
            size="small"
            stickyHeader
            sx={{
              width: '100%',
              tableLayout: 'fixed',
            }}
          >
            <TableHead>
              <TableRow>
                <TableCell>{t('common.product')}</TableCell>
                <TableCell align="right" sx={{ width: 72 }}>
                  {t('common.qty')}
                </TableCell>
                <TableCell align="right" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                  {t('pos.unitPrice')}
                </TableCell>
                <TableCell align="right" sx={{ width: 96 }}>
                  {t('cart.lineTotal')}
                </TableCell>
                <TableCell align="right" sx={{ width: 64 }}>
                  {t('common.actions')}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5}>
                    <Typography color="text.secondary" sx={{ py: 2 }}>
                      {t('cart.empty')}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
              {items.map((l) => {
                const { net } = computeLine({
                  qty: l.qty,
                  unit: l.unitPrice,
                  discount: l.discount,
                });
                return (
                  <TableRow
                    key={l.id}
                    hover
                    selected={selectedLineId === l.id}
                    onClick={() => onSelectLineId(l.id)}
                    sx={{
                      cursor: 'pointer',
                      '&.Mui-selected': { bgcolor: 'action.selected' },
                      '&.Mui-selected:hover': { bgcolor: 'action.selected' },
                    }}
                  >
                    <TableCell sx={{ overflow: 'hidden' }}>
                      <Typography fontWeight={600} noWrap title={l.code}>
                        {l.code}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: 'block' }}
                      >
                        {l.size} / {l.color} • {l.companyName}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ width: 72 }}>
                      <Typography fontWeight={600}>{formatNumber(l.qty)}</Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                      {formatNumber(l.unitPrice, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </TableCell>
                    <TableCell align="right">
                      {formatNumber(net, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        color="error"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveLine(l.id);
                        }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Box>
      )}
      {/* Bill-level modifiers */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        alignItems={{ xs: 'stretch', sm: 'center' }}
      >
        {(showBillDiscountControls || showTaxPercent) && (
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            alignItems="center"
            sx={{ flexGrow: 1 }}
          >
            {showBillDiscountControls && (
              <Select
                size="small"
                value={billDiscount.mode}
                onChange={(e) => setBillDiscount((d) => ({ ...d, mode: e.target.value }))}
                sx={{ width: { xs: '100%', sm: 140 } }}
                fullWidth
              >
                <MenuItem value="amount">{t('discount.amount')}</MenuItem>
                <MenuItem value="percent">{t('discount.percent')}</MenuItem>
              </Select>
            )}
            {showBillDiscountControls && (
              <TextField
                size="small"
                label={t('checkout.billDiscount')}
                type="number"
                value={billDiscount.value}
                onChange={(e) =>
                  setBillDiscount((d) => ({
                    ...d,
                    value: Math.max(0, Number(e.target.value) || 0),
                  }))
                }
                inputProps={{ min: 0, step: '0.01' }}
                sx={{ width: { xs: '100%', sm: 160 } }}
                fullWidth
              />
            )}
            {showTaxPercent && (
              <TextField
                size="small"
                label={t('checkout.taxPercent')}
                type="number"
                value={taxPercent}
                onChange={(e) =>
                  setTaxPercent(Math.max(0, Math.min(100, Number(e.target.value) || 0)))
                }
                inputProps={{ min: 0, max: 100, step: '0.01' }}
                sx={{ width: { xs: '100%', sm: 160 } }}
                fullWidth
              />
            )}
          </Stack>
        )}
        <Button
          startIcon={<ClearAllIcon />}
          variant="outlined"
          color="warning"
          onClick={clear}
          disabled={items.length === 0}
        >
          {t('cart.clearCart')}
        </Button>
      </Stack>

      {/* Totals */}
      {showTotals && (
        <Stack spacing={0.5} alignItems="flex-end">
          <Typography>
            {t('receipt.subtotal')}:{' '}
            {formatNumber(totals.itemSubtotal, {
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
            {formatNumber(totals.taxTotal, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Typography>
          <Typography variant="h6">
            {t('receipt.grandTotal')}:{' '}
            {formatNumber(totals.grandTotal, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Typography>
        </Stack>
      )}

      {/* Edit dialogs */}
      <Dialog open={qtyDialogOpen} onClose={closeQtyDialog} fullWidth maxWidth="xs">
        <DialogTitle>{t('common.qty')}</DialogTitle>
        <DialogContent dividers>
          <TextField
            fullWidth
            autoFocus
            margin="dense"
            label={t('common.qty')}
            type="number"
            value={qtyDraft}
            onChange={(e) => setQtyDraft(e.target.value)}
            inputProps={{ min: 0, step: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeQtyDialog}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={saveQty} disabled={!selectedLine}>
            {t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={priceDialogOpen} onClose={closePriceDialog} fullWidth maxWidth="xs">
        <DialogTitle>{t('pos.unitPrice')}</DialogTitle>
        <DialogContent dividers>
          <TextField
            fullWidth
            autoFocus
            margin="dense"
            label={t('pos.unitPrice')}
            type="number"
            value={priceDraft}
            onChange={(e) => setPriceDraft(e.target.value)}
            inputProps={{ min: 0, step: '0.01' }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closePriceDialog}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={savePrice} disabled={!selectedLine}>
            {t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
