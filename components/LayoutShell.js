'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AppBar, Toolbar, Typography, Button, Container, Box, ToggleButtonGroup, ToggleButton, IconButton } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { SignedIn, SignedOut, UserButton } from '@clerk/nextjs';
import { useI18n } from '@/components/i18n/useI18n';
import InstallPrompt from '@/components/pwa/InstallPrompt';
import AppDrawer from '@/components/navigation/AppDrawer';

export default function LayoutShell({ children }) {
  const { locale, setLocale, t } = useI18n();
  const pathname = usePathname();
  const pathSegments = (pathname || '').split('/').filter(Boolean);
  const isPOS = pathSegments.includes('pos');
  const isDelivery = pathSegments.includes('delivery');
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  const [online, setOnline] = React.useState(true);
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
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

  const handleLang = (_e, next) => {
    if (!next || next === locale) return;
    try {
      document.cookie = `lang=${next}; path=/; max-age=31536000`;
    } catch {}
    setLocale?.(next);
  };
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100dvh',
        bgcolor: 'background.default',
        width: '100%',
        maxWidth: '100vw',
      }}
    >
      <AppBar position="static" color="default" elevation={0} sx={{ width: '100%' }}>
        <Toolbar sx={{ gap: 1 }}>
          <IconButton
            edge="start"
            color="inherit"
            aria-label="menu"
            onClick={() => setDrawerOpen(true)}
            sx={{ display: { xs: 'inline-flex', md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {process.env.NEXT_PUBLIC_SHOP_NAME || t('nav.appTitle')}
          </Typography>
          <Button component={Link} href="/" color="inherit" sx={{ display: { xs: 'none', md: 'inline-flex' } }}>
            {t('nav.home')}
          </Button>
          <ToggleButtonGroup size="small" exclusive value={(locale || 'en').split('-')[0]} onChange={handleLang}>
            <ToggleButton value="en">EN</ToggleButton>
            <ToggleButton value="ar">AR</ToggleButton>
          </ToggleButtonGroup>
          <SignedIn>
            <Button component={Link} href="/dashboard" color="inherit" sx={{ display: { xs: 'none', md: 'inline-flex' } }}>
              {t('nav.dashboard')}
            </Button>
            <Button component={Link} href="/products" color="inherit" sx={{ display: { xs: 'none', md: 'inline-flex' } }}>
              {t('nav.products')}
            </Button>
            <Button component={Link} href="/companies" color="inherit" sx={{ display: { xs: 'none', md: 'inline-flex' } }}>
              {t('nav.companies')}
            </Button>
            <Button component={Link} href="/expenses" color="inherit" sx={{ display: { xs: 'none', md: 'inline-flex' } }}>
              {t('nav.expenses')}
            </Button>
            <Button component={Link} href="/receipts/new" color="inherit" sx={{ display: { xs: 'none', md: 'inline-flex' } }}>
              {t('nav.newPurchase')}
            </Button>
            <Button component={Link} href="/delivery/new" color="inherit" sx={{ display: { xs: 'none', md: 'inline-flex' } }}>
              {t('nav.delivery')}
            </Button>
            <Button component={Link} href="/pos" color="inherit" sx={{ display: { xs: 'none', md: 'inline-flex' } }}>
              {t('nav.pos')}
            </Button>
            <UserButton />
          </SignedIn>
          <SignedOut>
            <Button component={Link} href="/sign-in" variant="outlined">
              {t('nav.signIn')}
            </Button>
          </SignedOut>
        </Toolbar>
      </AppBar>
      {mounted && !online && (
        <Box sx={{ bgcolor: 'warning.light', color: 'warning.contrastText', textAlign: 'center', py: 0.5 }}>
          {t('status.offline')}
        </Box>
      )}
      <AppDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {isPOS || isDelivery ? (
        <Box component="main" sx={{ width: '100%', maxWidth: '100vw', flexGrow: 1 }}>
          {children}
        </Box>
      ) : (
        <Container component="main" maxWidth="lg" sx={{ py: 3, width: '100%' }}>
          {children}
        </Container>
      )}
      <InstallPrompt />
    </Box>
  );
}
