'use client';
import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Alert, Box, Button, Paper, Stack, TextField, Typography } from '@mui/material';

import { authClient } from '@/lib/auth-client';

export default function Page() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRedirectUrl = searchParams?.get?.('redirect_url') || '/';
  const redirectUrl = rawRedirectUrl.startsWith('/') ? rawRedirectUrl : '/';

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState('');

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await authClient.signIn.email({
        email: String(email || '').trim(),
        password: String(password || ''),
        callbackURL: redirectUrl,
      });
      if (res?.error) {
        setError(res.error.message || 'Failed to sign in');
        return;
      }
      router.push(redirectUrl);
      router.refresh();
    } catch (err) {
      setError(err?.message || 'Failed to sign in');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Box component="main" sx={{ display: 'grid', placeItems: 'center', minHeight: '70vh', p: 3 }}>
      <Paper sx={{ width: 'min(440px, 100%)', p: 3 }}>
        <Stack spacing={2}>
          <Typography variant="h5" fontWeight={800}>
            Sign in
          </Typography>
          {error ? <Alert severity="error">{error}</Alert> : null}
          <Box component="form" onSubmit={onSubmit}>
            <Stack spacing={2}>
              <TextField
                label="Email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                fullWidth
              />
              <TextField
                label="Password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                fullWidth
              />
              <Button type="submit" variant="contained" disabled={submitting}>
                {submitting ? 'Signing in…' : 'Sign in'}
              </Button>
            </Stack>
          </Box>
          <Typography variant="body2">
            Don&apos;t have an account?{' '}
            <Link href={`/sign-up?redirect_url=${encodeURIComponent(redirectUrl)}`}>Sign up</Link>
          </Typography>
        </Stack>
      </Paper>
    </Box>
  );
}
