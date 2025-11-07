'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AppBar, Toolbar, Typography, Button, Container, Box } from '@mui/material';
import { SignedIn, SignedOut, UserButton } from '@clerk/nextjs';

export default function LayoutShell({ children }) {
  const pathname = usePathname();
  const pathSegments = (pathname || '').split('/').filter(Boolean);
  const isPOS = pathSegments.includes('pos');
  const isDelivery = pathSegments.includes('delivery');
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
            {process.env.NEXT_PUBLIC_SHOP_NAME || 'Clothing Retail Accountings'}
          </Typography>
          <Button component={Link} href="/" color="inherit">
            Home
          </Button>
          <SignedIn>
            <Button component={Link} href="/dashboard" color="inherit">
              Dashboard
            </Button>
            <Button component={Link} href="/products" color="inherit">
              Products
            </Button>
            <Button component={Link} href="/companies" color="inherit">
              Companies
            </Button>
            <Button component={Link} href="/expenses" color="inherit">
              Expenses
            </Button>
            <Button component={Link} href="/receipts/new" color="inherit">
              New Purchase
            </Button>
          <Button component={Link} href="/delivery/new" color="inherit">
            Delivery
          </Button>
            <Button component={Link} href="/pos" color="inherit">
              POS
            </Button>
            <UserButton />
          </SignedIn>
          <SignedOut>
            <Button component={Link} href="/sign-in" variant="outlined">
              Sign in
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
    </Box>
  );
}
