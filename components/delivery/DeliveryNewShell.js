'use client';

import * as React from 'react';
import { Box, Paper, Stack, Typography, Button, ToggleButton, ToggleButtonGroup, Chip, TextField } from '@mui/material';
import POSCatalog from '@/components/pos/POSCatalog';
import CartView from '@/components/pos/CartView';
import OptimusForm from '@/components/delivery/OptimusForm';
import { computeReceiptTotals } from '@/lib/pricing';
import submitDelivery from '@/components/delivery/submitDelivery';
import { useCart } from '@/components/pos/useCart';
import { useI18n } from '@/components/i18n/useI18n';

export default function DeliveryNewShell({ companies }) {
  const cart = useCart();
  const { t, formatNumber } = useI18n();
  const { items } = cart;
  const [billDiscount, setBillDiscount] = React.useState({ mode: 'amount', value: 0 });
  const [taxPercent, setTaxPercent] = React.useState(0);
  const [submitting, setSubmitting] = React.useState(false);
  const [deliveryCompany, setDeliveryCompany] = React.useState('optimus');
  const [deliveryAddress, setDeliveryAddress] = React.useState({ line1: '', line2: '', city: '', state: '', postalCode: '', country: '' });
  const [deliveryContact, setDeliveryContact] = React.useState({ name: '', phone: '' });
  const [optimusData, setOptimusData] = React.useState({ cityId: '', areaId: '', cityName: '', areaName: '', name: '', phone: '', addressLine: '', codAmount: '' });

  const canCheckout = items.length > 0 && items.every((l) => Number(l.qty) > 0);
  const totals = computeReceiptTotals({
    type: 'sale',
    items: items.map((l) => ({ qty: Number(l.qty) || 0, unitPrice: Number(l.unitPrice) || 0, discount: l.discount && Number(l.discount.value) > 0 ? l.discount : undefined })),
    billDiscount: billDiscount && Number(billDiscount.value) > 0 ? billDiscount : undefined,
    taxPercent: Number(taxPercent) || 0,
  }).totals;

  const addVariant = React.useCallback((variant, product) => {
    cart.addVariant(variant, product);
  }, [cart]);

  async function onSubmit() {
    setSubmitting(true);
    try {
      await submitDelivery({
        items: cart.items,
        billDiscount,
        taxPercent,
        deliveryCompany,
        deliveryAddress: { ...deliveryAddress, ...(deliveryCompany === 'optimus' ? { line1: optimusData.addressLine, city: optimusData.cityName || String(optimusData.cityId || '') } : {}) },
        deliveryContact: deliveryCompany === 'optimus' ? { name: optimusData.name || '', phone: optimusData.phone || '' } : deliveryContact,
        deliveryProviderMeta: deliveryCompany === 'optimus' ? optimusData : undefined,
      });
      // Reset
      cart.clear();
      setBillDiscount({ mode: 'amount', value: 0 });
      setTaxPercent(0);
      setOptimusData({ cityId: '', areaId: '', cityName: '', areaName: '', name: '', phone: '', addressLine: '', codAmount: '' });
    } catch (e) {
      alert(e?.message || String(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Box sx={{ height: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography variant="h6">{t('delivery.newReceipt')}</Typography>
        <Chip size="small" label={`${t('pos.items')}: ${formatNumber(items.length)}`} />
        <Box sx={{ flex: 1 }} />
        <Typography variant="body2">{t('common.total')}: {formatNumber(totals.grandTotal, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
      </Box>
      <Box sx={{ p: 2, flex: 1, display: 'grid', gridTemplateColumns: '1fr', gap: 2 }}>
        <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
          <Typography variant="subtitle1" gutterBottom>{t('pos.catalog')}</Typography>
          <POSCatalog onPickVariant={(v, p) => addVariant(v, p)} isReturnMode={false} />
        </Paper>
        <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="subtitle1" gutterBottom>{t('cart.title')}</Typography>
          <CartView
            items={cart.items}
            inc={cart.inc}
            dec={cart.dec}
            setQty={cart.setQty}
            setUnitPrice={cart.setUnitPrice}
            setDiscount={cart.setDiscount}
            removeLine={cart.removeLine}
            clear={cart.clear}
            billDiscount={billDiscount}
            setBillDiscount={setBillDiscount}
            taxPercent={taxPercent}
            setTaxPercent={setTaxPercent}
          />
        </Paper>
      </Box>
      <Box sx={{ p: 2 }}>
        <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="subtitle1">{t('delivery.details')}</Typography>
          <ToggleButtonGroup size="small" exclusive value={deliveryCompany} onChange={(_e, val) => { if (val) setDeliveryCompany(val); }}>
            <ToggleButton value="optimus">{t('delivery.company.optimus')}</ToggleButton>
            <ToggleButton value="sabeq_laheq">{t('delivery.company.sabeq_laheq')}</ToggleButton>
          </ToggleButtonGroup>
          {deliveryCompany === 'optimus' ? (
            <OptimusForm value={optimusData} onChange={setOptimusData} />
          ) : (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <TextField label={t('delivery.contactName')} value={deliveryContact.name} onChange={(e) => setDeliveryContact((c) => ({ ...c, name: e.target.value }))} fullWidth />
              <TextField label={t('delivery.contactPhone')} value={deliveryContact.phone} onChange={(e) => setDeliveryContact((c) => ({ ...c, phone: e.target.value }))} fullWidth />
            </Stack>
          )}
          <Box sx={{ textAlign: 'right' }}>
            <Button variant="contained" disabled={!canCheckout || submitting} onClick={onSubmit}>
              {submitting ? t('delivery.creating') : t('delivery.createReceipt')}
            </Button>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}


