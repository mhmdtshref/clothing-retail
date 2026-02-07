'use client';
import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Alert, Box, Button, Paper, Stack, TextField, Typography } from '@mui/material';

import { useI18n } from '@/components/i18n/useI18n';
import { authClient } from '@/lib/auth-client';

export default function SignUpClient({ redirectUrl = '/', signupEnabled = true }) {
  const router = useRouter();
  const { t } = useI18n();

  const safeRedirectUrl = String(redirectUrl || '/').startsWith('/')
    ? String(redirectUrl || '/')
    : '/';
  const signInHref = `/sign-in?redirect_url=${encodeURIComponent(safeRedirectUrl)}`;

  const [name, setName] = React.useState('');
  const [username, setUsername] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState('');

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const usernameValue = String(username || '').trim();
      if (!usernameValue) {
        setError(t('auth.signUp.usernameRequired'));
        return;
      }
      const res = await authClient.signUp.email({
        name: String(name || '').trim() || undefined,
        username: usernameValue,
        email: String(email || '').trim(),
        password: String(password || ''),
        callbackURL: safeRedirectUrl,
      });
      if (res?.error) {
        setError(res.error.message || t('auth.signUp.errorGeneric'));
        return;
      }
      router.push(safeRedirectUrl);
      router.refresh();
    } catch (err) {
      setError(err?.message || t('auth.signUp.errorGeneric'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Box component="main" sx={{ display: 'grid', placeItems: 'center', minHeight: '70vh', p: 3 }}>
      <Paper sx={{ width: 'min(440px, 100%)', p: 3 }}>
        <Stack spacing={2}>
          <Typography variant="h5" fontWeight={800}>
            {t('auth.signUp.title')}
          </Typography>

          {!signupEnabled ? (
            <Alert severity="info">{t('auth.signUp.disabledMessage')}</Alert>
          ) : null}
          {signupEnabled && error ? <Alert severity="error">{error}</Alert> : null}

          {signupEnabled ? (
            <Box component="form" onSubmit={onSubmit}>
              <Stack spacing={2}>
                <TextField
                  label={t('auth.signUp.nameLabel')}
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  fullWidth
                />
                <TextField
                  label={t('auth.signUp.usernameLabel')}
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  fullWidth
                  helperText={t('auth.signUp.usernameHelper')}
                />
                <TextField
                  label={t('auth.signUp.emailLabel')}
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  fullWidth
                />
                <TextField
                  label={t('auth.signUp.passwordLabel')}
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  fullWidth
                  helperText={t('auth.signUp.passwordHelper')}
                />
                <Button type="submit" variant="contained" disabled={submitting}>
                  {submitting ? t('auth.signUp.submitting') : t('auth.signUp.submit')}
                </Button>
              </Stack>
            </Box>
          ) : (
            <Button component={Link} href={signInHref} variant="contained">
              {t('auth.signUp.signInLink')}
            </Button>
          )}

          <Typography variant="body2">
            {t('auth.signUp.haveAccount')}{' '}
            <Link href={signInHref}>{t('auth.signUp.signInLink')}</Link>
          </Typography>
        </Stack>
      </Paper>
    </Box>
  );
}
