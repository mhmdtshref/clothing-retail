'use client';

import * as React from 'react';
import { AppBar, Toolbar, Typography, Box, Paper, Stack, IconButton, Chip, Button, ToggleButtonGroup, ToggleButton } from '@mui/material';
import Link from 'next/link';
import RefreshIcon from '@mui/icons-material/Refresh';
import WifiIcon from '@mui/icons-material/Wifi';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import { useUser } from '@clerk/nextjs';
import POSCatalog from '@/components/pos/POSCatalog';
import CartView from '@/components/pos/CartView';
import { useCart } from '@/components/pos/useCart';
import CheckoutDialog from '@/components/pos/CheckoutDialog';
import CheckoutSuccess from '@/components/pos/CheckoutSuccess';
import CustomerDialog from '@/components/pos/CustomerDialog';
import { computeReceiptTotals } from '@/lib/pricing';
import { useI18n } from '@/components/i18n/useI18n';

function useClock() {
  const [now, setNow] = React.useState(() => new Date());
  React.useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

function useOnline() {
  // Start with a stable SSR-friendly default; update after mount to avoid hydration mismatch
  const [online, setOnline] = React.useState(true);
  React.useEffect(() => {
    setOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

export default function POSShell() {
  const { t, formatDate } = useI18n();
  const { user } = useUser();
  const now = useClock();
  const online = useOnline();
  const cart = useCart();
  const handlePickVariant = React.useCallback((variant, product) => {
    cart.addVariant(variant, product);
  }, [cart]);

  // Bill-level modifiers state
  const [billDiscount, setBillDiscount] = React.useState({ mode: 'amount', value: 0 });
  const [taxPercent, setTaxPercent] = React.useState(0);

  // Checkout state
  const [checkingOut, setCheckingOut] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [success, setSuccess] = React.useState(null); // { receipt, totals }
  const [customerOpen, setCustomerOpen] = React.useState(false);

  const canCheckout = cart.items.length > 0 && cart.items.every((l) => Number(l.qty) > 0);

  const clientTotals = computeReceiptTotals({
    type: cart.mode === 'sale_return' ? 'sale_return' : 'sale',
    items: cart.items.map((l) => ({
      qty: Number(l.qty) || 0,
      unitPrice: Number(l.unitPrice) || 0,
      discount: l.discount && Number(l.discount.value) > 0 ? l.discount : undefined,
    })),
    billDiscount: billDiscount && Number(billDiscount.value) > 0 ? billDiscount : undefined,
    taxPercent: Number(taxPercent) || 0,
  }).totals;

  async function submitSale({ method, note, reason, payMode, depositAmount }) {
    setSubmitting(true);
    try {
      const isReturn = cart.mode === 'sale_return';
      const isDeposit = !isReturn && payMode === 'deposit' && Number(depositAmount || 0) > 0;
      if (isDeposit && !cart.customer?._id) {
        throw new Error('Customer is required for deposit (pending) sales');
      }

      const customerIdToUse = cart.customer?._id || undefined;

      const payload = {
        type: isReturn ? 'sale_return' : 'sale',
        status: isDeposit ? 'pending' : 'completed',
        items: cart.items.map((l) => ({
          variantId: l.variantId,
          qty: Number(l.qty) || 0,
          unitPrice: Number(l.unitPrice) || 0,
          discount: l.discount && Number(l.discount.value) > 0
            ? { mode: l.discount.mode, value: Number(l.discount.value) }
            : undefined,
        })),
        billDiscount: billDiscount && Number(billDiscount.value) > 0
          ? { mode: billDiscount.mode, value: Number(billDiscount.value) }
          : undefined,
        taxPercent: Number(taxPercent) || 0,
        note: [method, note].filter(Boolean).join(' • '),
        ...(isReturn && reason ? { returnReason: reason } : {}),
        ...(customerIdToUse ? { customerId: customerIdToUse } : {}),
        ...(isDeposit ? { payments: [{ amount: Number(depositAmount || 0), method, note }] } : {}),
      };

      const res = await fetch('/api/receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error('Failed to create sale receipt');
      setSuccess({ receipt: json.receipt, totals: json.totals, paidTotal: json.paidTotal, dueTotal: json.dueTotal });
      setCheckingOut(false);
      cart.clear();
      cart.clearCustomer();
      setBillDiscount({ mode: 'amount', value: 0 });
      setTaxPercent(0);
    } catch (e) {
      alert(e?.message || String(e));
    } finally {
      setSubmitting(false);
    }
  }

  function startNewSale() {
    setSuccess(null);
    cart.clearCustomer();
  }

  React.useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  return (
    <Box sx={{ height: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static" color="primary">
        <Toolbar sx={{ gap: 2 }}>
          <Typography variant="h6" sx={{ flexGrow: 0 }}>
            {t('pos.title')}
          </Typography>
          <Chip
            size="small"
            label={online ? t('status.online') : t('status.offline')}
            icon={online ? <WifiIcon /> : <WifiOffIcon />}
            color={online ? 'success' : 'default'}
          />
          <Box sx={{ flexGrow: 1 }} />
          <Chip size="small" label={`${t('pos.items')}: ${cart.items.length}`} color="secondary" />
          <Typography variant="body2" sx={{ mr: 2 }} suppressHydrationWarning>
            {formatDate(now)}
          </Typography>
          <Typography variant="body2">
            {user?.fullName || user?.primaryEmailAddress?.emailAddress || 'User'}
          </Typography>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={cart.mode}
            onChange={(_e, val) => { if (val) cart.setMode(val); }}
            sx={{ '& .MuiToggleButton-root': { color: 'common.white', borderColor: 'rgba(255,255,255,0.3)' } }}
          >
            <ToggleButton
              value="sale"
              sx={{ '&.Mui-selected': { bgcolor: 'primary.main', color: 'primary.contrastText', '&:hover': { bgcolor: 'primary.dark' } } }}
            >
              {t('pos.sale')}
            </ToggleButton>
            <ToggleButton
              value="sale_return"
              sx={{ '&.Mui-selected': { bgcolor: 'warning.main', color: 'warning.contrastText', '&:hover': { bgcolor: 'warning.dark' } } }}
            >
              {t('pos.return')}
            </ToggleButton>
          </ToggleButtonGroup>
          <Button component={Link} href="/pos/history" color="inherit" variant="outlined">
            {t('pos.history')}
          </Button>
          {!success && (
            <Button
              variant={(!canCheckout || submitting) ? 'outlined' : 'contained'}
              color={cart.mode === 'sale_return' ? 'warning' : 'secondary'}
              disabled={!canCheckout || submitting}
              onClick={() => setCheckingOut(true)}
            >
              {t('pos.checkout')}
            </Button>
          )}
          <IconButton color="inherit" title="Refresh">
            <RefreshIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Box
        sx={{
          p: 2,
          flex: 1,
          overflow: 'hidden',
          width: '100%',
          maxWidth: '100%',
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: 2,
        }}
      >
        <Box sx={{ height: '100%' }}>
          <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column', ...(cart.mode === 'sale_return' ? { border: '1px solid', borderColor: 'warning.main', bgcolor: 'warning.light' } : {}) }}>
            <Typography variant="h6" gutterBottom>
              {t('pos.sale')}
            </Typography>
            <Stack spacing={2} sx={{ flex: 1, minHeight: 0 }}>
              {!success ? (
                <POSCatalog onPickVariant={handlePickVariant} isReturnMode={cart.mode === 'sale_return'} />
              ) : (
                <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.secondary' }}>
                  {success?.receipt?.status === 'pending' ? t('pos.salePendingMsg') : t('pos.saleCompletedMsg')}
                </Box>
              )}
            </Stack>
          </Paper>
        </Box>
        <Box sx={{ height: '100%' }}>
          <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" gutterBottom>
              {success ? t('pos.receipt') : (cart.mode === 'sale_return' ? t('cart.returnCart') : t('cart.title'))}
            </Typography>
            {!success && (
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <Button size="small" variant="outlined" onClick={() => setCustomerOpen(true)}>
                  {cart.customer ? t('pos.changeCustomer') : t('pos.selectCustomer')}
                </Button>
                {cart.customer && (
                  <>
                    <Typography variant="body2" sx={{ flex: 1 }}>
                      {cart.customer.name || t('common.noName')} • {cart.customer.phone}
                    </Typography>
                    <Button size="small" onClick={() => cart.clearCustomer()}>{t('common.clear')}</Button>
                  </>
                )}
              </Stack>
            )}
            <Stack spacing={2} sx={{ flex: 1, minHeight: 0 }}>
              {!success ? (
                <CartView
                  {...cart}
                  billDiscount={billDiscount}
                  setBillDiscount={setBillDiscount}
                  taxPercent={taxPercent}
                  setTaxPercent={setTaxPercent}
                />
              ) : (
                <CheckoutSuccess receipt={success.receipt} totals={success.totals} paidTotal={success.paidTotal} dueTotal={success.dueTotal} onNewSale={startNewSale} />
              )}
            </Stack>
          </Paper>
        </Box>
      </Box>
      <CheckoutDialog
        open={checkingOut}
        onClose={() => setCheckingOut(false)}
        onConfirm={submitSale}
        grandTotal={clientTotals.grandTotal}
        isReturn={cart.mode === 'sale_return'}
        initialContact={cart.customer || undefined}
      />
      <CustomerDialog
        open={customerOpen}
        onClose={() => setCustomerOpen(false)}
        onSelect={(c) => cart.setCustomer(c)}
        initialValue={cart.customer || undefined}
      />
    </Box>
  );
}
