'use client';

import * as React from 'react';
import Link from 'next/link';
import { AppBar, Toolbar, Typography, Button, Container, Box } from '@mui/material';
import { SignedIn, SignedOut, UserButton } from '@clerk/nextjs';

export default function LayoutShell({ children }) {
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="static" color="default" elevation={0}>
        <Toolbar sx={{ gap: 1 }}>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Clothing Retail Accounting
          </Typography>
          <Button component={Link} href="/" color="inherit">Home</Button>
          <SignedIn>
            <Button component={Link} href="/dashboard" color="inherit">Dashboard</Button>
            <UserButton />
          </SignedIn>
          <SignedOut>
            <Button component={Link} href="/sign-in" variant="outlined">Sign in</Button>
          </SignedOut>
        </Toolbar>
      </AppBar>

      <Container component="main" maxWidth="lg" sx={{ py: 3 }}>
        {children}
      </Container>
    </Box>
  );
}


