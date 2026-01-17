'use client';

import * as React from 'react';
import { AppBar, Toolbar, Typography, Box, Paper, Stack, IconButton, Chip, Button, ToggleButtonGroup, ToggleButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Select, MenuItem, Tooltip } from '@mui/material';
import Link from 'next/link';
import RefreshIcon from '@mui/icons-material/Refresh';
import WifiIcon from '@mui/icons-material/Wifi';
import { authClient } from '@/lib/auth-client';
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
import QtyIcon from '@/components/pos/icons/QtyIcon';
import UnitPriceIcon from '@/components/pos/icons/UnitPriceIcon';

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
  const { data: session } = authClient.useSession();
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
  const taxPercent = 0;
  const setTaxPercent = React.useCallback(() => {}, []);

  // Cart row selection + editor dialogs (POS)
  const [selectedLineId, setSelectedLineId] = React.useState(null);
  const selectedLine = React.useMemo(
    () => cart.items.find((l) => l.id === selectedLineId) || null,
    [cart.items, selectedLineId],
  );
  React.useEffect(() => {
    if (selectedLineId && !cart.items.some((l) => l.id === selectedLineId)) {
      setSelectedLineId(null);
    }
  }, [cart.items, selectedLineId]);

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
    cart.setQty(selectedLine.id, Math.max(0, Math.floor(Number(qtyDraft) || 0)));
    setQtyDialogOpen(false);
  }, [cart, selectedLine, qtyDraft]);

  const savePrice = React.useCallback(() => {
    if (!selectedLine) return;
    cart.setUnitPrice(selectedLine.id, Math.max(0, Number(priceDraft) || 0));
    setPriceDialogOpen(false);
  }, [cart, selectedLine, priceDraft]);

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

  const clientTotals = computeReceiptTotals({
    type: cart.mode === 'sale_return' ? 'sale_return' : 'sale',
    items: cart.items.map((l) => ({
      qty: Number(l.qty) || 0,
      unitPrice: Number(l.unitPrice) || 0,
      discount: l.discount && Number(l.discount.value) > 0 ? l.discount : undefined,
    })),
    billDiscount: billDiscount && Number(billDiscount.value) > 0 ? billDiscount : undefined,
    taxPercent: 0,
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
        taxPercent: 0,
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
          taxPercent: 0,
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
    <Box sx={{ height: '100dvh', display: 'flex', flexDirection: 'column', maxWidth: '100vw', overflow: 'hidden' }}>
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
            {mounted ? (session?.user?.name || session?.user?.email || 'User') : ''}
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

      <Box
        sx={{
          px: { xs: 1, sm: 2 },
          py: 1,
          flex: 1,
          minHeight: 0,
          width: '100%',
          maxWidth: '100%',
          overflow: 'hidden',
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: (!success ? '1fr 96px' : '1fr') },
          gridTemplateRows: { xs: (!success ? '1fr auto' : '1fr'), md: '1fr' },
          gap: 2,
        }}
      >
        <Box sx={{ height: '100%', minHeight: 0, gridColumn: 1, gridRow: 1 }}>
          <Paper sx={{ p: 1.5, height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <Typography variant="h6" gutterBottom>
              {success ? t('pos.receipt') : (cart.mode === 'sale_return' ? t('cart.returnCart') : t('cart.title'))}
            </Typography>
            {!success && (
              <Stack spacing={1} sx={{ mb: 1 }}>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1}
                  alignItems={{ xs: 'stretch', sm: 'center' }}
                >
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0 }}>
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
                  <Box sx={{ flex: 1, minWidth: 220 }}>
                    {/* Embedded product search (dropdown suggestions) */}
                    <POSCatalog onPickVariant={handlePickVariant} isReturnMode={cart.mode === 'sale_return'} compact />
                  </Box>
                </Stack>
              </Stack>
            )}
            <Stack spacing={1} sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
              {!success ? (
                <CartView
                  {...cart}
                  showEditor={false}
                  showTotals={false}
                  selectedLineId={selectedLineId}
                  onSelectLineId={setSelectedLineId}
                  billDiscount={billDiscount}
                  setBillDiscount={setBillDiscount}
                  taxPercent={taxPercent}
                  setTaxPercent={setTaxPercent}
                  showBillDiscountControls={false}
                  showTaxPercent={false}
                  scrollTable
                  disableBottomPadding
                />
              ) : (
                <CheckoutSuccess receipt={success.receipt} totals={success.totals} paidTotal={success.paidTotal} dueTotal={success.dueTotal} onNewSale={startNewSale} />
              )}
            </Stack>
            {!success && null}
          </Paper>
        </Box>

        {/* POS cart editor sidebar (outside the cart panel) */}
        {!success && (
          <Box
            sx={{
              gridColumn: { xs: 1, md: 2 },
              gridRow: { xs: 2, md: 1 },
              alignSelf: 'start',
              position: { md: 'sticky' },
              top: { md: 8 },
            }}
          >
            <Paper sx={{ p: 1 }}>
              <Stack direction="column" spacing={1} alignItems="center">
                <Tooltip title={t('common.qty')}>
                  <Box component="span">
                    <IconButton
                      size="small"
                      onClick={openQtyDialog}
                      disabled={!selectedLine}
                      aria-label={t('common.qty')}
                      sx={{
                        width: 36,
                        height: 36,
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1.5,
                        bgcolor: 'background.paper',
                      }}
                    >
                      <QtyIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Tooltip>
                <Tooltip title={t('pos.unitPrice')}>
                  <Box component="span">
                    <IconButton
                      size="small"
                      onClick={openPriceDialog}
                      disabled={!selectedLine}
                      aria-label={t('pos.unitPrice')}
                      sx={{
                        width: 36,
                        height: 36,
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1.5,
                        bgcolor: 'background.paper',
                      }}
                    >
                      <UnitPriceIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Tooltip>
              </Stack>
            </Paper>
          </Box>
        )}
      </Box>
      {!success && (
        <ResponsiveActionsBar
          sx={{
            py: 1,
            px: 1.5,
            pb: 'calc(8px + env(safe-area-inset-bottom, 0px))',
          }}
        >
          <Box
            sx={{
              display: 'grid',
              // Keep the important groups next to each other; leave any extra space at the end.
              gridTemplateColumns: 'auto 220px 1fr auto',
              gap: 1.25,
              alignItems: 'center',
            }}
          >
            {/* Column 1: subtotal + discount controls + bill discount */}
            <Stack spacing={0.5} sx={{ minWidth: 0 }}>
              <Typography variant="caption" noWrap sx={{ lineHeight: 1.2 }}>
                {t('receipt.subtotal')}: {formatNumber(clientTotals.itemSubtotal, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Typography>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={0.75}
                alignItems={{ xs: 'stretch', sm: 'center' }}
              >
                <Select
                  size="small"
                  value={billDiscount.mode}
                  onChange={(e) => setBillDiscount((d) => ({ ...d, mode: e.target.value }))}
                  sx={{
                    width: { xs: '100%', sm: 96 },
                    height: 32,
                    '& .MuiSelect-select': { py: 0.5, fontSize: 13 },
                  }}
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
                  sx={{
                    width: { xs: '100%', sm: 120 },
                    '& .MuiOutlinedInput-root': { height: 32 },
                    '& .MuiInputBase-input': { py: 0.5, fontSize: 13 },
                    '& .MuiInputLabel-root': { fontSize: 12 },
                  }}
                  fullWidth
                />
              </Stack>
              <Typography variant="caption" noWrap sx={{ lineHeight: 1.2 }}>
                {t('receipt.billDiscount')}: −{formatNumber(clientTotals.billDiscountTotal, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Typography>
            </Stack>

            {/* Column 2: grand total (highlighted) + checkout below */}
            <Stack spacing={0.75} sx={{ minWidth: 0 }}>
              <Box
                sx={{
                  bgcolor: 'common.black',
                  color: 'common.white',
                  px: 1.5,
                  py: 0.5,
                  borderRadius: 1.5,
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  gap: 1,
                }}
              >
                <Typography variant="caption" sx={{ opacity: 0.9 }} noWrap>
                  {t('receipt.grandTotal')}
                </Typography>
                <Typography variant="subtitle1" fontWeight={900} noWrap>
                  {formatNumber(clientTotals.grandTotal, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Typography>
              </Box>
              <Button
                fullWidth
                size="small"
                variant={(!canCheckout || submitting) ? 'outlined' : 'contained'}
                color={cart.mode === 'sale_return' ? 'warning' : 'secondary'}
                disabled={!canCheckout || submitting}
                onClick={() => setCheckingOut(true)}
                title={!cashbox.open ? t('cashbox.openCashbox') : undefined}
              >
                {t('pos.checkout')}
              </Button>
            </Stack>

            {/* Column 3: sale/return toggle */}
            <Box sx={{ display: 'flex', justifyContent: { xs: 'stretch', md: 'flex-end' }, alignItems: 'center' }}>
              <ToggleButtonGroup
                size="small"
                exclusive
                value={cart.mode}
                onChange={(_e, val) => { if (val) cart.setMode(val); }}
                sx={{ width: 'auto' }}
              >
                <ToggleButton value="sale" sx={{ py: 0.5, px: 1.25 }}>
                  {t('pos.sale')}
                </ToggleButton>
                <ToggleButton value="sale_return" sx={{ py: 0.5, px: 1.25 }}>
                  {t('pos.return')}
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>
          </Box>
        </ResponsiveActionsBar>
      )}
      <CheckoutDialog
        open={checkingOut}
        onClose={() => setCheckingOut(false)}
        onConfirm={submitSale}
        grandTotal={clientTotals.grandTotal}
        isReturn={cart.mode === 'sale_return'}
        hasCustomer={Boolean(cart.customer?._id)}
        initialContact={cart.customer || undefined}
      />

      {/* Cart editor dialogs */}
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
          <Button variant="contained" onClick={saveQty} disabled={!selectedLine}>{t('common.save')}</Button>
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
          <Button variant="contained" onClick={savePrice} disabled={!selectedLine}>{t('common.save')}</Button>
        </DialogActions>
      </Dialog>

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
