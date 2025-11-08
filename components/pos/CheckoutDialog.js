'use client';

import * as React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Stack, TextField, MenuItem, Typography, ToggleButtonGroup, ToggleButton,
} from '@mui/material';
import OptimusForm from '@/components/delivery/OptimusForm';
import CustomerDialog from '@/components/pos/CustomerDialog';

const METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'external_card', label: 'External Card Terminal' },
  { value: 'other', label: 'Other' },
];

export default function CheckoutDialog({ open, onClose, onConfirm, grandTotal, isReturn = false, initialContact }) {
  const [method, setMethod] = React.useState('cash');
  const [note, setNote] = React.useState('');
  const [reason, setReason] = React.useState('');
  const [payMode, setPayMode] = React.useState('full'); // 'full' | 'deposit'
  const [depositAmount, setDepositAmount] = React.useState('');
  const [deliveryMode, setDeliveryMode] = React.useState(false);
  const [deliveryCompany, setDeliveryCompany] = React.useState('optimus');
  const [deliveryAddress, setDeliveryAddress] = React.useState({ line1: '', line2: '', city: '', state: '', postalCode: '', country: '' });
  const [deliveryContact, setDeliveryContact] = React.useState({ name: '', phone: '' });
  const [optimusData, setOptimusData] = React.useState({ cityId: '', areaId: '', cityName: '', areaName: '', name: '', phone: '', addressLine: '', codAmount: '' });
  const [contactDialogOpen, setContactDialogOpen] = React.useState(false);
  const [pickedCustomer, setPickedCustomer] = React.useState(null);

  React.useEffect(() => {
    if (open) {
      setMethod('cash');
      setNote('');
      setReason('');
      setPayMode('full');
      setDepositAmount('');
      setDeliveryMode(false);
      setDeliveryCompany('optimus');
      setDeliveryAddress({ line1: '', line2: '', city: '', state: '', postalCode: '', country: '' });
      setDeliveryContact({ name: initialContact?.name || '', phone: initialContact?.phone || '' });
      setOptimusData({ cityId: '', areaId: '', cityName: '', areaName: '', name: initialContact?.name || '', phone: (initialContact?.phone || '').replace(/\D/g, '').slice(0, 10), addressLine: '', codAmount: String(Number(grandTotal || 0).toFixed(2)) });
      setPickedCustomer(null);
    }
  }, [open, initialContact]);

  const canSubmitDelivery = !isReturn && deliveryMode && (
    deliveryCompany !== 'optimus' || (
      optimusData.cityId && optimusData.areaId && optimusData.addressLine && /^\d{10}$/.test(String(optimusData.phone || ''))
    )
  );

  return (
    <>
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Checkout</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {!isReturn && (
            <ToggleButtonGroup
              exclusive
              color="primary"
              size="small"
              value={deliveryMode ? 'delivery' : payMode}
              onChange={(_e, v) => {
                if (!v) return;
                if (v === 'delivery') {
                  setDeliveryMode(true);
                } else {
                  setDeliveryMode(false);
                  setPayMode(v);
                }
              }}
            >
              <ToggleButton value="full">Full payment</ToggleButton>
              <ToggleButton value="deposit">Deposit</ToggleButton>
              <ToggleButton value="delivery">Delivery (COD)</ToggleButton>
            </ToggleButtonGroup>
          )}
          {!deliveryMode && (
            <TextField select label="Payment Method" value={method} onChange={(e) => setMethod(e.target.value)}>
            {METHODS.map((m) => (
              <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
            ))}
            </TextField>
          )}
          {!isReturn && !deliveryMode && payMode === 'deposit' && (
            <TextField
              label="Amount paid now"
              type="number"
              inputProps={{ min: 0, step: '0.01' }}
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
            />
          )}
          {deliveryMode && (
            <Stack spacing={2}>
              <TextField select label="Delivery Company" value={deliveryCompany} onChange={(e) => setDeliveryCompany(e.target.value)}>
                <MenuItem value="optimus">Optimus</MenuItem>
                <MenuItem value="sabeq_laheq">Sabeq Laheq</MenuItem>
              </TextField>
              {deliveryCompany === 'optimus' ? (
                <OptimusForm value={optimusData} onChange={(next) => {
                  setOptimusData(next);
                }} disabled={false} />
              ) : (
                <>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                    <Button size="small" variant="outlined" onClick={() => setContactDialogOpen(true)}>Select Contact</Button>
                    <TextField label="Contact Name" value={deliveryContact.name} onChange={(e) => setDeliveryContact((c) => ({ ...c, name: e.target.value }))} fullWidth />
                    <TextField label="Contact Phone" value={deliveryContact.phone} onChange={(e) => setDeliveryContact((c) => ({ ...c, phone: e.target.value }))} fullWidth />
                  </Stack>
                  <TextField label="Address Line 1" value={deliveryAddress.line1} onChange={(e) => setDeliveryAddress((a) => ({ ...a, line1: e.target.value }))} />
                  <TextField label="Address Line 2" value={deliveryAddress.line2} onChange={(e) => setDeliveryAddress((a) => ({ ...a, line2: e.target.value }))} />
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                    <TextField label="City" value={deliveryAddress.city} onChange={(e) => setDeliveryAddress((a) => ({ ...a, city: e.target.value }))} fullWidth />
                    <TextField label="State" value={deliveryAddress.state} onChange={(e) => setDeliveryAddress((a) => ({ ...a, state: e.target.value }))} fullWidth />
                  </Stack>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                    <TextField label="Postal Code" value={deliveryAddress.postalCode} onChange={(e) => setDeliveryAddress((a) => ({ ...a, postalCode: e.target.value }))} fullWidth />
                    <TextField label="Country" value={deliveryAddress.country} onChange={(e) => setDeliveryAddress((a) => ({ ...a, country: e.target.value }))} fullWidth />
                  </Stack>
                </>
              )}
            </Stack>
          )}
          <TextField label="Note" value={note} onChange={(e) => setNote(e.target.value)} multiline minRows={2} />
          {isReturn && (
            <TextField label="Return Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} multiline minRows={2} />
          )}
          <Typography variant="h6" sx={{ textAlign: 'right' }}>Total: {Number(grandTotal || 0).toFixed(2)}</Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          disabled={deliveryMode && deliveryCompany === 'optimus' && !canSubmitDelivery}
          onClick={() => onConfirm({
            method,
            note,
            reason,
            payMode,
            depositAmount: Number(depositAmount || 0),
            deliveryMode,
            deliveryCompany,
            deliveryAddress: deliveryCompany === 'optimus'
              ? {
                  ...deliveryAddress,
                  line1: optimusData.addressLine,
                  city: optimusData.cityName || String(optimusData.cityId || ''),
                }
              : deliveryAddress,
            deliveryContact: deliveryCompany === 'optimus'
              ? { name: optimusData.name || '', phone: optimusData.phone || '' }
              : deliveryContact,
            deliveryProviderMeta: deliveryCompany === 'optimus' ? optimusData : undefined,
            customerOverrideId: pickedCustomer?._id,
          })}
        >
          {isReturn ? 'Confirm Return' : 'Confirm & Pay'}
        </Button>
      </DialogActions>
    </Dialog>
    <CustomerDialog
      open={contactDialogOpen}
      onClose={() => setContactDialogOpen(false)}
      onSelect={(c) => {
        setPickedCustomer(c);
        setDeliveryContact({ name: c.name || '', phone: c.phone || '' });
        setOptimusData((d) => ({ ...d, name: c.name || '', phone: String(c.phone || '').replace(/\D/g, '').slice(0, 10) }));
        setContactDialogOpen(false);
      }}
      initialValue={pickedCustomer || undefined}
    />
    </>
  );
}


