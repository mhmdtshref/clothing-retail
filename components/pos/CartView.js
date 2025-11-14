'use client';

import * as React from 'react';
import {
  Box, Stack, Table, TableHead, TableRow, TableCell, TableBody,
  IconButton, TextField, Select, MenuItem, Button, Typography, Tooltip, useMediaQuery, useTheme,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import { computeLine, computeReceiptTotals } from '@/lib/pricing';
import { useI18n } from '@/components/i18n/useI18n';

export default function CartView({ items, inc, dec, setQty, setUnitPrice, setDiscount, removeLine, clear, billDiscount, setBillDiscount, taxPercent, setTaxPercent }) {
  const { t, formatNumber } = useI18n();
  const subtotal = items.reduce((sum, l) => sum + (computeLine({ qty: l.qty, unit: l.unitPrice, discount: l.discount }).net || 0), 0);
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down('sm'));

  const pricingPayload = React.useMemo(() => ({
    type: 'sale',
    items: items.map((l) => ({
      qty: Number(l.qty) || 0,
      unitPrice: Number(l.unitPrice) || 0,
      discount: l.discount && Number(l.discount.value) > 0 ? l.discount : undefined,
    })),
    billDiscount: billDiscount && Number(billDiscount.value) > 0 ? billDiscount : undefined,
    taxPercent: Number(taxPercent) || 0,
  }), [items, billDiscount, taxPercent]);

  const { totals } = computeReceiptTotals(pricingPayload);

  return (
    <Stack spacing={2} sx={{ pb: { xs: '96px', sm: 0 } }}>
      <Box sx={{ width: '100%', overflowX: 'hidden' }}>
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
              <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>{t('common.variant')}</TableCell>
              <TableCell align="right" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>{t('pos.onHand')}</TableCell>
              <TableCell align="right" sx={{ width: 72 }}>{t('common.qty')}</TableCell>
              <TableCell align="right" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>{t('pos.unitPrice')}</TableCell>
              <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>{t('common.discount')}</TableCell>
              <TableCell align="right" sx={{ width: 96 }}>{t('cart.lineTotal')}</TableCell>
              <TableCell align="right" sx={{ width: 64 }}>{t('common.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={8}>
                  <Typography color="text.secondary" sx={{ py: 2 }}>{t('cart.empty')}</Typography>
                </TableCell>
              </TableRow>
            )}
            {items.map((l) => {
              const { line, lineDiscount, net } = computeLine({ qty: l.qty, unit: l.unitPrice, discount: l.discount });
              const over = l.qty > l.onHand;
              return (
                <TableRow key={l.id} hover>
                  <TableCell sx={{ overflow: 'hidden' }}>
                    <Typography fontWeight={600} noWrap title={l.code}>{l.code}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>{l.name || '\u00A0'}</Typography>
                  </TableCell>
                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                    <Typography variant="body2">{l.size} / {l.color}</Typography>
                    <Typography variant="caption" color="text.secondary">{l.companyName}</Typography>
                  </TableCell>
                  <TableCell align="right" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>{formatNumber(l.onHand)}</TableCell>
                  <TableCell align="right" sx={{ width: 72 }}>
                    {isXs ? (
                      <Stack direction="column" spacing={0} alignItems="center" justifyContent="center">
                        <IconButton size="small" onClick={() => inc(l.id)} aria-label="Increase">
                          <AddIcon fontSize="small" />
                        </IconButton>
                        <Typography
                          variant="body1"
                          sx={{
                            width: 28,
                            textAlign: 'center',
                            color: over ? 'error.main' : 'inherit',
                            fontWeight: 600,
                            lineHeight: 1.2,
                          }}
                          title={over ? t('cart.overOnHand') : undefined}
                        >
                          {formatNumber(l.qty)}
                        </Typography>
                        <IconButton size="small" onClick={() => dec(l.id)} disabled={l.qty <= 0} aria-label="Decrease">
                          <RemoveIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    ) : (
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center">
                        <IconButton size="small" onClick={() => dec(l.id)} disabled={l.qty <= 0}><RemoveIcon fontSize="small" /></IconButton>
                        <TextField
                          size="small"
                          type="number"
                          value={l.qty}
                          onChange={(e) => setQty(l.id, e.target.value)}
                          inputProps={{ min: 0, step: 1, style: { width: 56, textAlign: 'right' } }}
                          error={over}
                          helperText={over ? t('cart.overOnHand') : ''}
                        />
                        <IconButton size="small" onClick={() => inc(l.id)}><AddIcon fontSize="small" /></IconButton>
                      </Stack>
                    )}
                  </TableCell>
                  <TableCell align="right" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                    <TextField
                      size="small"
                      type="number"
                      value={l.unitPrice}
                      onChange={(e) => setUnitPrice(l.id, e.target.value)}
                      inputProps={{ min: 0, step: '0.01', style: { width: 96, textAlign: 'right' } }}
                    />
                  </TableCell>
                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Select size="small" value={l.discount?.mode || 'amount'} onChange={(e) => setDiscount(l.id, { mode: e.target.value })}>
                        <MenuItem value="amount">{t('discount.amount')}</MenuItem>
                        <MenuItem value="percent">{t('discount.percent')}</MenuItem>
                      </Select>
                      <TextField
                        size="small"
                        type="number"
                        value={l.discount?.value || 0}
                        onChange={(e) => setDiscount(l.id, { value: Math.max(0, Number(e.target.value) || 0) })}
                        inputProps={{ min: 0, step: '0.01', style: { width: 96 } }}
                      />
                    </Stack>
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title={`${t('cart.line')}: ${formatNumber(line, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} • ${t('cart.itemDisc')}: ${formatNumber(lineDiscount, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}>
                      <span>{formatNumber(net, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </Tooltip>
                  </TableCell>
                  <TableCell align="right">
                    <IconButton color="error" onClick={() => removeLine(l.id)}><DeleteIcon /></IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Box>
      {/* Bill-level modifiers */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="center" sx={{ flexGrow: 1 }}>
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
          <TextField
            size="small"
            label={t('checkout.billDiscount')}
            type="number"
            value={billDiscount.value}
            onChange={(e) => setBillDiscount((d) => ({ ...d, value: Math.max(0, Number(e.target.value) || 0) }))}
            inputProps={{ min: 0, step: '0.01' }}
            sx={{ width: { xs: '100%', sm: 160 } }}
            fullWidth
          />
          <TextField
            size="small"
            label={t('checkout.taxPercent')}
            type="number"
            value={taxPercent}
            onChange={(e) => setTaxPercent(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
            inputProps={{ min: 0, max: 100, step: '0.01' }}
            sx={{ width: { xs: '100%', sm: 160 } }}
            fullWidth
          />
        </Stack>
        <Button startIcon={<ClearAllIcon />} variant="outlined" color="warning" onClick={clear} disabled={items.length === 0}>{t('cart.clearCart')}</Button>
      </Stack>

      {/* Totals */}
      <Stack spacing={0.5} alignItems="flex-end">
        <Typography>{t('receipt.subtotal')}: {formatNumber(totals.itemSubtotal, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
        <Typography>{t('receipt.itemDiscounts')}: −{formatNumber(totals.itemDiscountTotal, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
        <Typography>{t('receipt.billDiscount')}: −{formatNumber(totals.billDiscountTotal, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
        <Typography>{t('receipt.tax')} ({formatNumber(totals.taxPercent)}%): {formatNumber(totals.taxTotal, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
        <Typography variant="h6">{t('receipt.grandTotal')}: {formatNumber(totals.grandTotal, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
      </Stack>
    </Stack>
  );
}


