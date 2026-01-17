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

  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState('');

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await authClient.signUp.email({
        name: String(name || '').trim() || undefined,
        email: String(email || '').trim(),
        password: String(password || ''),
        callbackURL: redirectUrl,
      });
      if (res?.error) {
        setError(res.error.message || 'Failed to sign up');
        return;
      }
      router.push(redirectUrl);
      router.refresh();
    } catch (err) {
      setError(err?.message || 'Failed to sign up');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Box component="main" sx={{ display: 'grid', placeItems: 'center', minHeight: '70vh', p: 3 }}>
      <Paper sx={{ width: 'min(440px, 100%)', p: 3 }}>
        <Stack spacing={2}>
          <Typography variant="h5" fontWeight={800}>
            Sign up
          </Typography>
          {error ? <Alert severity="error">{error}</Alert> : null}
          <Box component="form" onSubmit={onSubmit}>
            <Stack spacing={2}>
              <TextField
                label="Name"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                fullWidth
              />
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
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                fullWidth
                helperText="Minimum 8 characters (default)"
              />
              <Button type="submit" variant="contained" disabled={submitting}>
                {submitting ? 'Creating account…' : 'Create account'}
              </Button>
            </Stack>
          </Box>
          <Typography variant="body2">
            Already have an account?{' '}
            <Link href={`/sign-in?redirect_url=${encodeURIComponent(redirectUrl)}`}>Sign in</Link>
          </Typography>
        </Stack>
      </Paper>
    </Box>
  );
}
