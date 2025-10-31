'use client';

import * as React from 'react';
import {
  Box, Stack, Table, TableHead, TableRow, TableCell, TableBody,
  IconButton, TextField, Select, MenuItem, Button, Typography, Tooltip,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import { computeLine, computeReceiptTotals } from '@/lib/pricing';

export default function CartView({ items, inc, dec, setQty, setUnitPrice, setDiscount, removeLine, clear, billDiscount, setBillDiscount, taxPercent, setTaxPercent }) {
  const subtotal = items.reduce((sum, l) => sum + (computeLine({ qty: l.qty, unit: l.unitPrice, discount: l.discount }).net || 0), 0);

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
    <Stack spacing={2} sx={{ height: '100%' }}>
      <Box sx={{ overflow: 'auto', flex: 1, minHeight: 0 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Product</TableCell>
              <TableCell>Variant</TableCell>
              <TableCell align="right">On hand</TableCell>
              <TableCell align="right">Qty</TableCell>
              <TableCell align="right">Unit Price</TableCell>
              <TableCell>Discount</TableCell>
              <TableCell align="right">Line Total</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={8}>
                  <Typography color="text.secondary" sx={{ py: 2 }}>Cart is empty. Add items from the catalog.</Typography>
                </TableCell>
              </TableRow>
            )}
            {items.map((l) => {
              const { line, lineDiscount, net } = computeLine({ qty: l.qty, unit: l.unitPrice, discount: l.discount });
              const over = l.qty > l.onHand;
              return (
                <TableRow key={l.id} hover>
                  <TableCell>
                    <Typography fontWeight={600}>{l.code}</Typography>
                    <Typography variant="body2" color="text.secondary">{l.name || '\u00A0'}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{l.size} / {l.color}</Typography>
                    <Typography variant="caption" color="text.secondary">{l.companyName}</Typography>
                  </TableCell>
                  <TableCell align="right">{l.onHand}</TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center">
                      <IconButton size="small" onClick={() => dec(l.id)} disabled={l.qty <= 0}><RemoveIcon fontSize="small" /></IconButton>
                      <TextField
                        size="small"
                        type="number"
                        value={l.qty}
                        onChange={(e) => setQty(l.id, e.target.value)}
                        inputProps={{ min: 0, step: 1, style: { width: 64, textAlign: 'right' } }}
                        error={over}
                        helperText={over ? 'over on-hand' : ''}
                      />
                      <IconButton size="small" onClick={() => inc(l.id)}><AddIcon fontSize="small" /></IconButton>
                    </Stack>
                  </TableCell>
                  <TableCell align="right">
                    <TextField
                      size="small"
                      type="number"
                      value={l.unitPrice}
                      onChange={(e) => setUnitPrice(l.id, e.target.value)}
                      inputProps={{ min: 0, step: '0.01', style: { width: 96, textAlign: 'right' } }}
                    />
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Select size="small" value={l.discount?.mode || 'amount'} onChange={(e) => setDiscount(l.id, { mode: e.target.value })}>
                        <MenuItem value="amount">amount</MenuItem>
                        <MenuItem value="percent">percent</MenuItem>
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
                    <Tooltip title={`line: ${line.toFixed(2)} • itemDisc: ${lineDiscount.toFixed(2)}`}>
                      <span>{net.toFixed(2)}</span>
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
        <Stack direction="row" spacing={1} alignItems="center" sx={{ flexGrow: 1 }}>
          <Select size="small" value={billDiscount.mode} onChange={(e) => setBillDiscount((d) => ({ ...d, mode: e.target.value }))}>
            <MenuItem value="amount">amount</MenuItem>
            <MenuItem value="percent">percent</MenuItem>
          </Select>
          <TextField
            size="small"
            label="Bill Discount"
            type="number"
            value={billDiscount.value}
            onChange={(e) => setBillDiscount((d) => ({ ...d, value: Math.max(0, Number(e.target.value) || 0) }))}
            inputProps={{ min: 0, step: '0.01', style: { width: 120 } }}
          />
          <TextField
            size="small"
            label="Tax %"
            type="number"
            value={taxPercent}
            onChange={(e) => setTaxPercent(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
            inputProps={{ min: 0, max: 100, step: '0.01', style: { width: 120 } }}
          />
        </Stack>
        <Button startIcon={<ClearAllIcon />} variant="outlined" color="warning" onClick={clear} disabled={items.length === 0}>Clear cart</Button>
      </Stack>

      {/* Totals */}
      <Stack spacing={0.5} alignItems="flex-end">
        <Typography>Item Subtotal: {totals.itemSubtotal.toFixed(2)}</Typography>
        <Typography>Item Discounts: −{totals.itemDiscountTotal.toFixed(2)}</Typography>
        <Typography>Bill Discount: −{totals.billDiscountTotal.toFixed(2)}</Typography>
        <Typography>Tax ({totals.taxPercent}%): {totals.taxTotal.toFixed(2)}</Typography>
        <Typography variant="h6">Grand Total: {totals.grandTotal.toFixed(2)}</Typography>
      </Stack>
    </Stack>
  );
}


