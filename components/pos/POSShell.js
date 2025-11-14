'use client';

import * as React from 'react';
import { AppBar, Toolbar, Typography, Box, Paper, Stack, IconButton, Chip, Button, ToggleButtonGroup, ToggleButton } from '@mui/material';
import Link from 'next/link';
import RefreshIcon from '@mui/icons-material/Refresh';
import WifiIcon from '@mui/icons-material/Wifi';
import { useUser } from '@clerk/nextjs';
import POSCatalog from '@/components/pos/POSCatalog';
import CartView from '@/components/pos/CartView';
import { useCart } from '@/components/pos/useCart';
import CheckoutDialog from '@/components/pos/CheckoutDialog';
import CheckoutSuccess from '@/components/pos/CheckoutSuccess';
import CustomerDialog from '@/components/pos/CustomerDialog';
import { computeReceiptTotals } from '@/lib/pricing';
import { useI18n } from '@/components/i18n/useI18n';
import OpenCashboxDialog from '@/components/pos/cashbox/OpenCashboxDialog';
import AdjustCashDialog from '@/components/pos/cashbox/AdjustCashDialog';
import CloseCashboxDialog from '@/components/pos/cashbox/CloseCashboxDialog';
import CashboxZReport from '@/components/pos/cashbox/CashboxZReport';
import ViewCashboxDialog from '@/components/pos/cashbox/ViewCashboxDialog';
import { enqueueReceipt } from '@/lib/offline/sync';
import ResponsiveActionsBar from '@/components/common/ResponsiveActionsBar';

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
  const { t, formatDate, formatNumber } = useI18n();
  const { user } = useUser();
  const now = useClock();
  const online = useOnline();
  const cart = useCart();
  const handlePickVariant = React.useCallback((variant, product) => {
    cart.addVariant(variant, product);
  }, [cart]);
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => { setMounted(true); }, []);

  // Bill-level modifiers state
  const [billDiscount, setBillDiscount] = React.useState({ mode: 'amount', value: 0 });
  const [taxPercent, setTaxPercent] = React.useState(0);

  // Checkout state
  const [checkingOut, setCheckingOut] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [success, setSuccess] = React.useState(null); // { receipt, totals }
  const [customerOpen, setCustomerOpen] = React.useState(false);

  // Cashbox state
  const [cashbox, setCashbox] = React.useState({ open: false, expectedCash: 0, summary: null });
  const [openDialog, setOpenDialog] = React.useState(false);
  const [adjustDialog, setAdjustDialog] = React.useState(false);
  const [closeDialog, setCloseDialog] = React.useState(false);
  const [lastReport, setLastReport] = React.useState(null);
  const [viewDialog, setViewDialog] = React.useState(false);

  const refreshCashbox = React.useCallback(async () => {
    try {
      const res = await fetch('/api/cashbox/session', { cache: 'no-store' });
      const json = await res.json();
      if (json?.ok && json?.open) {
        setCashbox({ open: true, expectedCash: Number(json?.summary?.expectedCash || 0), summary: json.summary });
      } else {
        setCashbox({ open: false, expectedCash: 0, summary: null });
      }
    } catch {
      setCashbox((c) => c);
    }
  }, []);

  React.useEffect(() => { refreshCashbox(); }, [refreshCashbox]);

  const canCheckout = cashbox.open && cart.items.length > 0 && cart.items.every((l) => Number(l.qty) > 0);

  // Improve disabled contrast on dark app bar
  const disabledOnDark = {
    '&.Mui-disabled': {
      color: 'rgba(255,255,255,0.7) !important',
      borderColor: 'rgba(255,255,255,0.3) !important',
      backgroundColor: 'rgba(255,255,255,0.08) !important',
    },
  };

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
      // Fallback to offline outbox for receipts (queue when offline)
      try {
        await enqueueReceipt({
          type: cart.mode === 'sale_return' ? 'sale_return' : 'sale',
          status: (!cart.mode === 'sale_return' && payMode === 'deposit' && Number(depositAmount || 0) > 0) ? 'pending' : 'completed',
          items: cart.items.map((l) => ({
            variantId: l.variantId,
            qty: Number(l.qty) || 0,
            unitPrice: Number(l.unitPrice) || 0,
            discount: l.discount && Number(l.discount.value) > 0
              ? { mode: l.discount.mode, value: Number(l.discount.value) }
              : undefined,
          })),
          billDiscount: billDiscount && Number(billDiscount.value) > 0 ? { mode: billDiscount.mode, value: Number(billDiscount.value) } : undefined,
          taxPercent: Number(taxPercent) || 0,
          note: [method, note].filter(Boolean).join(' • '),
          ...(cart.mode === 'sale_return' && reason ? { returnReason: reason } : {}),
          ...(cart.customer?._id ? { customerId: cart.customer._id } : {}),
          payments: (!cart.mode === 'sale_return' && payMode === 'deposit' && Number(depositAmount || 0) > 0)
            ? [{ amount: Number(depositAmount || 0), method, note }]
            : [],
        });
        alert(t('common.saved')); // queued
        setCheckingOut(false);
      } catch {
        alert(e?.message || String(e));
      }
    } finally {
      setSubmitting(false);
    }
  }

  function startNewSale() {
    setSuccess(null);
    cart.clearCustomer();
  }

  // SW registration moved to a global registrar

  return (
    <Box sx={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', maxWidth: '100vw', overflowX: 'hidden' }}>
      <AppBar position="static" color="primary">
        <Toolbar sx={{ gap: 1, flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
          <Typography variant="h6" sx={{ flexGrow: 0 }}>
            {t('pos.title')}
          </Typography>
          <Box component="span" suppressHydrationWarning sx={{ display: 'inline-flex', gap: 1, minWidth: 0 }}>
            <Chip
              size="small"
              icon={<WifiIcon />}
              label={online ? t('status.online') : t('status.offline')}
              color={online ? 'success' : 'default'}
            />
            <Chip
              size="small"
              color={cashbox.open ? 'success' : 'default'}
              label={cashbox.open ? t('cashbox.open') : t('cashbox.closed')}
              onClick={() => setViewDialog(true)}
              sx={{ cursor: 'pointer' }}
            />
          </Box>
          <Box sx={{ flexGrow: 1 }} />
          <Chip size="small" label={`${t('pos.items')}: ${cart.items.length}`} color="secondary" sx={{ display: { xs: 'none', sm: 'inline-flex' } }} />
          <Typography variant="body2" sx={{ mr: 2, display: { xs: 'none', sm: 'inline' }, minWidth: 0 }} suppressHydrationWarning>
            {mounted ? formatDate(now) : ''}
          </Typography>
          <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'inline' } }} suppressHydrationWarning>
            {mounted ? (user?.fullName || user?.primaryEmailAddress?.emailAddress || 'User') : ''}
          </Typography>
          {!cashbox.open ? (
            <Button color="inherit" variant="outlined" onClick={() => setOpenDialog(true)}>
              {t('cashbox.openCashbox')}
            </Button>
          ) : (
            <>
              <Button color="inherit" onClick={() => setAdjustDialog(true)} sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>{t('cashbox.adjust')}</Button>
              <Button color="inherit" variant="outlined" onClick={() => setCloseDialog(true)} sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>{t('cashbox.close')}</Button>
              {lastReport && (
                <Button color="inherit" onClick={() => window.print()} sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>{t('cashbox.printZReport')}</Button>
              )}
            </>
          )}
          <Button component={Link} href="/pos/history" color="inherit" variant="outlined" sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>
            {t('pos.history')}
          </Button>
          <IconButton color="inherit" title="Refresh" sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>
            <RefreshIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Box sx={{ px: { xs: 1, sm: 2 }, py: 1, flex: 1, width: '100%', maxWidth: '100%', display: 'grid', gridTemplateColumns: '1fr', gap: 2, pb: { xs: '96px', sm: 0 } }}>
        <Box sx={{ height: { xs: 'auto', sm: '100%' } }}>
          <Paper sx={{ p: 2, height: { xs: 'auto', sm: '100%' }, display: 'flex', flexDirection: 'column', mb: { xs: 6, sm: 0 }, ...(cart.mode === 'sale_return' ? { border: '1px solid', borderColor: 'warning.main', bgcolor: 'warning.light' } : {}) }}>
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
        <Box sx={{ height: { xs: 'auto', sm: '100%' } }}>
          <Paper sx={{ p: 2, height: { xs: 'auto', sm: '100%' }, display: 'flex', flexDirection: 'column', mb: { xs: 6, sm: 0 } }}>
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
            {!success && null}
          </Paper>
        </Box>
      </Box>
      {!success && (
        <ResponsiveActionsBar>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            alignItems={{ xs: 'stretch', sm: 'center' }}
            justifyContent="space-between"
          >
            <ToggleButtonGroup
              size="small"
              exclusive
              value={cart.mode}
              onChange={(_e, val) => { if (val) cart.setMode(val); }}
            >
              <ToggleButton value="sale">
                {t('pos.sale')}
              </ToggleButton>
              <ToggleButton value="sale_return">
                {t('pos.return')}
              </ToggleButton>
            </ToggleButtonGroup>
            <Button
              variant={(!canCheckout || submitting) ? 'outlined' : 'contained'}
              color={cart.mode === 'sale_return' ? 'warning' : 'secondary'}
              disabled={!canCheckout || submitting}
              onClick={() => setCheckingOut(true)}
              title={!cashbox.open ? t('cashbox.openCashbox') : undefined}
              sx={{ minWidth: 180 }}
            >
              {t('pos.checkout')}
            </Button>
          </Stack>
        </ResponsiveActionsBar>
      )}
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
      <OpenCashboxDialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        onOpened={() => { refreshCashbox(); }}
      />
      <AdjustCashDialog
        open={adjustDialog}
        onClose={() => setAdjustDialog(false)}
        onAdjusted={() => { refreshCashbox(); }}
      />
      <CloseCashboxDialog
        open={closeDialog}
        onClose={() => setCloseDialog(false)}
        summary={cashbox.summary}
        onClosed={(report) => { setLastReport(report); refreshCashbox(); setTimeout(() => window.print(), 50); }}
      />
      <CashboxZReport report={lastReport} />
      <ViewCashboxDialog
        open={viewDialog}
        onClose={() => setViewDialog(false)}
        expected={cashbox.expectedCash}
      />
    </Box>
  );
}
