'use client';

import * as React from 'react';
import { AppBar, Toolbar, Typography, Box, Paper, Stack, IconButton, Chip } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import WifiIcon from '@mui/icons-material/Wifi';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import { useUser } from '@clerk/nextjs';
import POSCatalog from '@/components/pos/POSCatalog';
import CartView from '@/components/pos/CartView';
import { useCart } from '@/components/pos/useCart';

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
          <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" gutterBottom>
              Catalog
            </Typography>
            <Stack spacing={2} sx={{ flex: 1, minHeight: 0 }}>
              <POSCatalog onPickVariant={handlePickVariant} />
            </Stack>
          </Paper>
        </Box>
        <Box sx={{ height: '100%' }}>
          <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" gutterBottom>
              Cart
            </Typography>
            <Stack spacing={2} sx={{ flex: 1, minHeight: 0 }}>
              <CartView {...cart} />
            </Stack>
          </Paper>
        </Box>
      </Box>
    </Box>
  );
}
