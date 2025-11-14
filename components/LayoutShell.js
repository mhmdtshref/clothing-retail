'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AppBar, Toolbar, Typography, Button, Container, Box, ToggleButtonGroup, ToggleButton } from '@mui/material';
import { SignedIn, SignedOut, UserButton } from '@clerk/nextjs';
import { useI18n } from '@/components/i18n/useI18n';
import InstallPrompt from '@/components/pwa/InstallPrompt';

export default function LayoutShell({ children }) {
  const { locale, setLocale, t } = useI18n();
  const pathname = usePathname();
  const pathSegments = (pathname || '').split('/').filter(Boolean);
  const isPOS = pathSegments.includes('pos');
  const isDelivery = pathSegments.includes('delivery');

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
        minHeight: '100vh',
        bgcolor: 'background.default',
        width: '100%',
        maxWidth: '100vw',
      }}
    >
      <AppBar position="static" color="default" elevation={0} sx={{ width: '100%' }}>
        <Toolbar sx={{ gap: 1 }}>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            {process.env.NEXT_PUBLIC_SHOP_NAME || t('nav.appTitle')}
          </Typography>
          <Button component={Link} href="/" color="inherit">
            {t('nav.home')}
          </Button>
          <ToggleButtonGroup size="small" exclusive value={(locale || 'en').split('-')[0]} onChange={handleLang}>
            <ToggleButton value="en">EN</ToggleButton>
            <ToggleButton value="ar">AR</ToggleButton>
          </ToggleButtonGroup>
          <SignedIn>
            <Button component={Link} href="/dashboard" color="inherit">
              {t('nav.dashboard')}
            </Button>
            <Button component={Link} href="/products" color="inherit">
              {t('nav.products')}
            </Button>
            <Button component={Link} href="/companies" color="inherit">
              {t('nav.companies')}
            </Button>
            <Button component={Link} href="/expenses" color="inherit">
              {t('nav.expenses')}
            </Button>
            <Button component={Link} href="/receipts/new" color="inherit">
              {t('nav.newPurchase')}
            </Button>
            <Button component={Link} href="/delivery/new" color="inherit">
              {t('nav.delivery')}
            </Button>
            <Button component={Link} href="/pos" color="inherit">
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
