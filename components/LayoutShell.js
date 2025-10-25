'use client';

import * as React from 'react';
import Link from 'next/link';
import { AppBar, Toolbar, Typography, Button, Container, Box } from '@mui/material';
import { SignedIn, SignedOut, UserButton } from '@clerk/nextjs';

export default function LayoutShell({ children }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'background.default', width: '100%' }}>
      <AppBar position="static" color="default" elevation={0} sx={{ width: '100%' }}>
        <Toolbar sx={{ gap: 1 }}>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Clothing Retail Accounting
          </Typography>
          <Button component={Link} href="/" color="inherit">Home</Button>
          <SignedIn>
            <Button component={Link} href="/dashboard" color="inherit">Dashboard</Button>
            <Button component={Link} href="/products" color="inherit">Products</Button>
            <UserButton />
          </SignedIn>
          <SignedOut>
            <Button component={Link} href="/sign-in" variant="outlined">Sign in</Button>
          </SignedOut>
        </Toolbar>
      </AppBar>

      <Container component="main" maxWidth="lg" sx={{ py: 3, width: '100%' }}>
        {children}
      </Container>
    </Box>
  );
}


