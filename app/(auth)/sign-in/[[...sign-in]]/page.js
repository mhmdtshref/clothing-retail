'use client';
import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Alert, Box, Button, Paper, Stack, TextField, Typography } from '@mui/material';

import { useI18n } from '@/components/i18n/useI18n';
import { authClient } from '@/lib/auth-client';

export default function Page() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRedirectUrl = searchParams?.get?.('redirect_url') || '/';
  const redirectUrl = rawRedirectUrl.startsWith('/') ? rawRedirectUrl : '/';

  const { t } = useI18n();
  const [identifier, setIdentifier] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState('');

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const id = String(identifier || '').trim();
      if (!id) {
        setError(t('auth.signIn.identifierRequired'));
        return;
      }
      const isEmail = id.includes('@');
      const res = isEmail
        ? await authClient.signIn.email({
            email: id,
            password: String(password || ''),
            callbackURL: redirectUrl,
          })
        : await authClient.signIn.username({
            username: id,
            password: String(password || ''),
          });
      if (res?.error) {
        setError(res.error.message || t('auth.signIn.errorGeneric'));
        return;
      }
      router.push(redirectUrl);
      router.refresh();
    } catch (err) {
      setError(err?.message || t('auth.signIn.errorGeneric'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Box component="main" sx={{ display: 'grid', placeItems: 'center', minHeight: '70vh', p: 3 }}>
      <Paper sx={{ width: 'min(440px, 100%)', p: 3 }}>
        <Stack spacing={2}>
          <Typography variant="h5" fontWeight={800}>
            {t('auth.signIn.title')}
          </Typography>
          {error ? <Alert severity="error">{error}</Alert> : null}
          <Box component="form" onSubmit={onSubmit}>
            <Stack spacing={2}>
              <TextField
                label={t('auth.signIn.identifierLabel')}
                type="text"
                autoComplete="username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                fullWidth
              />
              <TextField
                label={t('auth.signIn.passwordLabel')}
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                fullWidth
              />
              <Button type="submit" variant="contained" disabled={submitting}>
                {submitting ? t('auth.signIn.submitting') : t('auth.signIn.submit')}
              </Button>
            </Stack>
          </Box>
          <Typography variant="body2">
            {t('auth.signIn.noAccount')}{' '}
            <Link href={`/sign-up?redirect_url=${encodeURIComponent(redirectUrl)}`}>
              {t('auth.signIn.signUpLink')}
            </Link>
          </Typography>
        </Stack>
      </Paper>
    </Box>
  );
}
