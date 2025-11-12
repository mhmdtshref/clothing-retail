'use client';

import * as React from 'react';
import { Box, Paper, Stack, Typography, Stepper, Step, StepLabel, Button, ToggleButton, ToggleButtonGroup, TextField } from '@mui/material';
import { useI18n } from '@/components/i18n/useI18n';
import POSCatalog from '@/components/pos/POSCatalog';
import CartView from '@/components/pos/CartView';
import OptimusForm from '@/components/delivery/OptimusForm';
import submitDelivery from '@/components/delivery/submitDelivery';
import { useCart } from '@/components/pos/useCart';
import { computeReceiptTotals } from '@/lib/pricing';
import ReceiptPrintTemplate from '@/components/pos/ReceiptPrintTemplate';

export default function DeliveryWizardShell() {
  const { t, formatNumber } = useI18n();
  const cart = useCart();
  const returnCart = useCart();
  const [activeStep, setActiveStep] = React.useState(0);
  const [billDiscount, setBillDiscount] = React.useState({ mode: 'amount', value: 0 });
  const [taxPercent, setTaxPercent] = React.useState(0);
  const [deliveryCompany, setDeliveryCompany] = React.useState('optimus');
  const [deliveryAddress, setDeliveryAddress] = React.useState({ line1: '', line2: '', city: '', state: '', postalCode: '', country: '' });
  const [deliveryContact, setDeliveryContact] = React.useState({ name: '', phone: '' });
  const [optimusData, setOptimusData] = React.useState({ cityId: '', areaId: '', cityName: '', areaName: '', name: '', phone: '', addressLine: '', codAmount: '', deliveryFees: '' });
  const [hasReturn, setHasReturn] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [result, setResult] = React.useState(null); // { receipt, totals, ... }

  const totals = computeReceiptTotals({
    type: 'sale',
    items: cart.items.map((l) => ({ qty: Number(l.qty) || 0, unitPrice: Number(l.unitPrice) || 0, discount: l.discount && Number(l.discount.value) > 0 ? l.discount : undefined })),
    billDiscount: billDiscount && Number(billDiscount.value) > 0 ? billDiscount : undefined,
    taxPercent: Number(taxPercent) || 0,
  }).totals;

  const returnTotals = computeReceiptTotals({
    type: 'sale_return',
    items: returnCart.items.map((l) => ({ qty: Number(l.qty) || 0, unitPrice: Number(l.unitPrice) || 0, discount: l.discount && Number(l.discount.value) > 0 ? l.discount : undefined })),
  }).totals;

  const fees = Math.max(0, Number(optimusData?.deliveryFees || 0) || 0);
  const saleGrand = Number(totals?.grandTotal || 0);
  const returnGrand = Number(returnTotals?.grandTotal || 0);
  const codPreClamp = (hasReturn ? (saleGrand - returnGrand) : saleGrand) + fees;
  const codToCollect = Math.max(0, codPreClamp);

  const canNextFromStep1 = cart.items.length > 0 && cart.items.every((l) => Number(l.qty) > 0);
  const canNextFromReturns = !hasReturn || returnCart.items.length >= 0; // allow empty return list

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const json = await submitDelivery({
        items: cart.items,
        billDiscount,
        taxPercent,
        deliveryCompany,
        deliveryAddress: { ...deliveryAddress, ...(deliveryCompany === 'optimus' ? { line1: optimusData.addressLine, city: optimusData.cityName || String(optimusData.cityId || '') } : {}) },
        deliveryContact: deliveryCompany === 'optimus' ? { name: optimusData.name || '', phone: optimusData.phone || '' } : deliveryContact,
        deliveryProviderMeta: deliveryCompany === 'optimus' ? { ...optimusData, hasReturn, returnNotes: '', codAmount: Number(codToCollect.toFixed(2)), enteredDeliveryFees: Number(optimusData?.deliveryFees || 0) } : undefined,
        hasReturn,
        returnItems: hasReturn ? returnCart.items : [],
      });
      setResult(json);
      setActiveStep(hasReturn ? 3 : 2);
    } catch (e) {
      alert(e?.message || String(e));
    } finally {
      setSubmitting(false);
    }
  }

  function resetWizard() {
    setActiveStep(0);
    cart.clear();
    returnCart.clear();
    setBillDiscount({ mode: 'amount', value: 0 });
    setTaxPercent(0);
    setDeliveryCompany('optimus');
    setDeliveryAddress({ line1: '', line2: '', city: '', state: '', postalCode: '', country: '' });
    setDeliveryContact({ name: '', phone: '' });
    setOptimusData({ cityId: '', areaId: '', cityName: '', areaName: '', name: '', phone: '', addressLine: '', codAmount: '', deliveryFees: '' });
    setHasReturn(false);
    setResult(null);
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ mb: 1 }}>{t('delivery.newReceipt')}</Typography>
      <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 2 }}>
        <Step><StepLabel>{t('pos.sale')}</StepLabel></Step>
        <Step><StepLabel>{t('delivery.details')}</StepLabel></Step>
        {hasReturn && <Step><StepLabel>{t('delivery.returned')}</StepLabel></Step>}
        <Step><StepLabel>{t('delivery.result')}</StepLabel></Step>
      </Stepper>

      {activeStep === 0 && (
        <Paper sx={{ p: 2 }}>
          <Stack direction="column" spacing={2}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1" gutterBottom>{t('pos.sale')}</Typography>
              <POSCatalog onPickVariant={(v, p) => cart.addVariant(v, p)} isReturnMode={false} />
            </Box>
            <Box sx={{ flex: 1 }}>
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
            </Box>
          </Stack>
          <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{ mt: 2 }}>
            <Button variant="contained" onClick={() => setActiveStep(1)} disabled={!canNextFromStep1}>{t('common.next')}</Button>
          </Stack>
        </Paper>
      )}

      {activeStep === 1 && (
        <Paper sx={{ p: 2 }}>
          <Stack spacing={2}>
            <Typography variant="subtitle1">{t('delivery.details')}</Typography>
            <ToggleButtonGroup size="small" exclusive value={deliveryCompany} onChange={(_e, val) => { if (val) setDeliveryCompany(val); }}>
              <ToggleButton value="optimus">{t('delivery.company.optimus')}</ToggleButton>
              <ToggleButton value="sabeq_laheq">{t('delivery.company.sabeq_laheq')}</ToggleButton>
            </ToggleButtonGroup>
            <ToggleButtonGroup size="small" exclusive value={hasReturn ? 'yes' : 'no'} onChange={(_e, val) => { if (val === 'yes') setHasReturn(true); if (val === 'no') setHasReturn(false); }}>
              <ToggleButton value="no">{t('delivery.normalShipment')}</ToggleButton>
              <ToggleButton value="yes">{t('delivery.exchangeShipment')}</ToggleButton>
            </ToggleButtonGroup>
            {deliveryCompany === 'optimus' ? (
              <OptimusForm value={optimusData} onChange={setOptimusData} amountFieldMode="fees" />
            ) : (
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <TextField label={t('delivery.contactName')} value={deliveryContact.name} onChange={(e) => setDeliveryContact((c) => ({ ...c, name: e.target.value }))} fullWidth />
                <TextField label={t('delivery.contactPhone')} value={deliveryContact.phone} onChange={(e) => setDeliveryContact((c) => ({ ...c, phone: e.target.value }))} fullWidth />
              </Stack>
            )}
            <Stack direction="row" spacing={2} justifyContent="flex-end" alignItems="center">
              <Typography variant="body2" color="text.secondary">
                {t('delivery.codToCollect')}: {formatNumber(codToCollect, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Typography>
              <Button variant="outlined" onClick={() => setActiveStep(0)}>{t('common.back')}</Button>
              {hasReturn ? (
                <Button variant="contained" onClick={() => setActiveStep(2)}>{t('common.next')}</Button>
              ) : (
                <Button variant="contained" onClick={handleSubmit} disabled={submitting}>{submitting ? t('common.submitting') : t('common.submit')}</Button>
              )}
            </Stack>
          </Stack>
        </Paper>
      )}

      {hasReturn && activeStep === 2 && (
        <Paper sx={{ p: 2 }}>
          <Stack direction="column" spacing={2}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1" gutterBottom>{t('delivery.returned')}</Typography>
              <POSCatalog onPickVariant={(v, p) => returnCart.addVariant(v, p)} isReturnMode={true} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1" gutterBottom>{t('cart.returnCart')}</Typography>
              <CartView
                items={returnCart.items}
                inc={returnCart.inc}
                dec={returnCart.dec}
                setQty={returnCart.setQty}
                setUnitPrice={returnCart.setUnitPrice}
                setDiscount={returnCart.setDiscount}
                removeLine={returnCart.removeLine}
                clear={returnCart.clear}
                billDiscount={{ mode: 'amount', value: 0 }}
                setBillDiscount={() => {}}
                taxPercent={0}
                setTaxPercent={() => {}}
              />
              {/* Moved COD display to the bottom actions row */}
            </Box>
          </Stack>
          <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{ mt: 2 }} alignItems="center">
            <Typography variant="body2" color="text.secondary">
              {t('delivery.codToCollect')}: {formatNumber(codToCollect, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Typography>
            <Button variant="outlined" onClick={() => setActiveStep(1)}>{t('common.back')}</Button>
            <Button variant="contained" onClick={handleSubmit} disabled={submitting || !canNextFromReturns}>
              {submitting ? t('common.submitting') : t('common.submit')}
            </Button>
          </Stack>
        </Paper>
      )}

      {((!hasReturn && activeStep === 2) || (hasReturn && activeStep === 3)) && result && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle1" gutterBottom>{t('delivery.receiptCreated')}</Typography>
          <Box sx={{ border: '1px solid', borderColor: 'divider', p: 1 }}>
            <ReceiptPrintTemplate receipt={result.receipt} totals={result.totals} autoPrint={false} />
          </Box>
          <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{ mt: 2 }}>
            <Button variant="outlined" onClick={resetWizard}>{t('delivery.newReceipt')}</Button>
            <Button variant="contained" onClick={() => window.print()}>{t('common.print')}</Button>
          </Stack>
        </Paper>
      )}
    </Box>
  );
}

