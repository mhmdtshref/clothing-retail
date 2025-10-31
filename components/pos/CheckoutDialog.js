'use client';

import * as React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Stack, TextField, MenuItem, Typography,
} from '@mui/material';

const METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'external_card', label: 'External Card Terminal' },
  { value: 'other', label: 'Other' },
];

export default function CheckoutDialog({ open, onClose, onConfirm, grandTotal }) {
  const [method, setMethod] = React.useState('cash');
  const [note, setNote] = React.useState('');

  React.useEffect(() => {
    if (open) {
      setMethod('cash');
      setNote('');
    }
  }, [open]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Checkout</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField select label="Payment Method" value={method} onChange={(e) => setMethod(e.target.value)}>
            {METHODS.map((m) => (
              <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
            ))}
          </TextField>
          <TextField label="Note" value={note} onChange={(e) => setNote(e.target.value)} multiline minRows={2} />
          <Typography variant="h6" sx={{ textAlign: 'right' }}>Total: {Number(grandTotal || 0).toFixed(2)}</Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={() => onConfirm({ method, note })}>Confirm & Pay</Button>
      </DialogActions>
    </Dialog>
  );
}


