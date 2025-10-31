'use client';

import * as React from 'react';
import { AppBar, Toolbar, Typography, Box, Paper, Stack, IconButton, Chip, Button, ToggleButtonGroup, ToggleButton } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import WifiIcon from '@mui/icons-material/Wifi';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import { useUser } from '@clerk/nextjs';
import POSCatalog from '@/components/pos/POSCatalog';
import CartView from '@/components/pos/CartView';
import { useCart } from '@/components/pos/useCart';
import CheckoutDialog from '@/components/pos/CheckoutDialog';
import CheckoutSuccess from '@/components/pos/CheckoutSuccess';
import { computeReceiptTotals } from '@/lib/pricing';

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

  async function submitSale({ method, note, reason }) {
    setSubmitting(true);
    try {
      const payload = {
        type: cart.mode === 'sale_return' ? 'sale_return' : 'sale',
        status: 'completed',
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
        ...(cart.mode === 'sale_return' && reason ? { returnReason: reason } : {}),
      };

      const res = await fetch('/api/receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || json?.error || 'Failed to create sale receipt');
      setSuccess({ receipt: json.receipt, totals: json.totals });
      setCheckingOut(false);
      cart.clear();
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
            POS
          </Typography>
          <Chip
            size="small"
            label={online ? 'Online' : 'Offline'}
            icon={online ? <WifiIcon /> : <WifiOffIcon />}
            color={online ? 'success' : 'default'}
          />
          <Box sx={{ flexGrow: 1 }} />
          <Chip size="small" label={`Items: ${cart.items.length}`} />
          <Typography variant="body2" sx={{ mr: 2 }} suppressHydrationWarning>
            {now.toLocaleString()}
          </Typography>
          <Typography variant="body2">
            {user?.fullName || user?.primaryEmailAddress?.emailAddress || 'User'}
          </Typography>
          <ToggleButtonGroup
            size="small"
            exclusive
            color={cart.mode === 'sale_return' ? 'warning' : 'primary'}
            value={cart.mode}
            onChange={(_e, val) => { if (val) cart.setMode(val); }}
          >
            <ToggleButton value="sale">Sale</ToggleButton>
            <ToggleButton value="sale_return">Return</ToggleButton>
          </ToggleButtonGroup>
          {!success && (
            <Button color="inherit" variant="outlined" disabled={!canCheckout || submitting} onClick={() => setCheckingOut(true)}>
              Checkout
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
          gridTemplateColumns: {
            xs: '1fr',
            md: '8fr 4fr',
            lg: '9fr 3fr',
            xl: '9fr 3fr',
          },
          gap: 2,
        }}
      >
        <Box sx={{ height: '100%' }}>
          <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column', ...(cart.mode === 'sale_return' ? { border: '1px solid', borderColor: 'warning.main', bgcolor: 'warning.light' } : {}) }}>
            <Typography variant="h6" gutterBottom>
              Catalog
            </Typography>
            <Stack spacing={2} sx={{ flex: 1, minHeight: 0 }}>
              {!success ? (
                <POSCatalog onPickVariant={handlePickVariant} isReturnMode={cart.mode === 'sale_return'} />
              ) : (
                <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.secondary' }}>
                  Sale completed. Use the right panel to print or start a new sale.
                </Box>
              )}
            </Stack>
          </Paper>
        </Box>
        <Box sx={{ height: '100%' }}>
          <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" gutterBottom>
              {success ? 'Receipt' : (cart.mode === 'sale_return' ? 'Cart (Return)' : 'Cart')}
            </Typography>
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
                <CheckoutSuccess receipt={success.receipt} totals={success.totals} onNewSale={startNewSale} />
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
      />
    </Box>
  );
}
