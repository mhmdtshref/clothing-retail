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
import { computeLine } from '@/lib/pricing';

export default function CartView({ items, inc, dec, setQty, setUnitPrice, setDiscount, removeLine, clear }) {
  const subtotal = items.reduce((sum, l) => sum + (computeLine({ qty: l.qty, unit: l.unitPrice, discount: l.discount }).net || 0), 0);

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
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="subtitle1">Subtotal (after per-item discounts): {subtotal.toFixed(2)}</Typography>
        <Button startIcon={<ClearAllIcon />} variant="outlined" color="warning" onClick={clear} disabled={items.length === 0}>Clear cart</Button>
      </Stack>
    </Stack>
  );
}


