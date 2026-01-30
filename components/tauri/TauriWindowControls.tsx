'use client';

import * as React from 'react';
import {
  Box,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Snackbar,
  Alert,
} from '@mui/material';
import RemoveIcon from '@mui/icons-material/Remove';
import CloseIcon from '@mui/icons-material/Close';

import { useI18n } from '@/components/i18n/useI18n';

function isWindowsPlatform() {
  try {
    return /windows/i.test(navigator.userAgent || '');
  } catch {
    return false;
  }
}

function isTauriRuntime() {
  try {
    // `withGlobalTauri: true` exposes a global.
    // Some versions use `__TAURI__`, others rely on internals.
    return typeof window !== 'undefined' && (Boolean((window as any).__TAURI__) || Boolean((window as any).__TAURI_INTERNALS__));
  } catch {
    return false;
  }
}

export default function TauriWindowControls({ collapsed = false }: { collapsed?: boolean }) {
  const { t } = useI18n();
  const [enabled, setEnabled] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [errorOpen, setErrorOpen] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string>('');

  React.useEffect(() => {
    setEnabled(isWindowsPlatform() && isTauriRuntime());
  }, []);

  const minimize = React.useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      const win = getCurrentWindow();

      try {
        await win.minimize();
        return;
      } catch (minimizeErr) {
        // On Windows, minimizing a fullscreen window can be unreliable depending on current state.
        // Fallback: exit fullscreen, minimize, then restore fullscreen once the window is focused again.
        try {
          const isFs = await win.isFullscreen();
          if (!isFs) throw minimizeErr;

          await win.setFullscreen(false);

          const unlisten = await win.onFocusChanged(async ({ payload: focused }) => {
            if (!focused) return;
            try {
              await win.setFullscreen(true);
            } catch (err) {
              console.error('Failed to restore fullscreen after unminimize', err);
            } finally {
              try {
                unlisten();
              } catch {}
            }
          });

          await win.minimize();
          return;
        } catch (fallbackErr) {
          console.error('Failed to minimize app window', { minimizeErr, fallbackErr });
          setErrorMessage(t('tauri.minimizeFailed'));
          setErrorOpen(true);
        }
      }
    } catch (err) {
      console.error('Failed to load Tauri window API', err);
      setErrorMessage(t('tauri.minimizeFailed'));
      setErrorOpen(true);
    } finally {
      setBusy(false);
    }
  }, [busy, t]);

  const confirmClose = React.useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      const win = getCurrentWindow();
      try {
        await win.close();
        return;
      } catch (closeErr) {
        // `close()` emits a closeRequested event and can be blocked; also can fail due to missing permissions.
        // `destroy()` forces the window close.
        try {
          await win.destroy();
          return;
        } catch (destroyErr) {
          console.error('Failed to close app window', { closeErr, destroyErr });
          setErrorMessage(t('tauri.closeFailed'));
          setErrorOpen(true);
        }
      }
    } catch (err) {
      console.error('Failed to load Tauri window API', err);
      setErrorMessage(t('tauri.closeFailed'));
      setErrorOpen(true);
    } finally {
      setBusy(false);
    }
  }, [busy, t]);

  if (!enabled) return null;

  return (
    <>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          flexDirection: collapsed ? 'column' : 'row',
          gap: collapsed ? 0 : 0.25,
        }}
      >
        <Tooltip title={t('tauri.minimize')}>
          <span>
            <IconButton
              aria-label={t('tauri.minimize')}
              size="small"
              onClick={minimize}
              disabled={busy}
              sx={{ p: 0.5 }}
            >
              <RemoveIcon fontSize="inherit" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title={t('tauri.closeApp')}>
          <span>
            <IconButton
              aria-label={t('tauri.closeApp')}
              size="small"
              onClick={() => setConfirmOpen(true)}
              disabled={busy}
              sx={{ p: 0.5 }}
            >
              <CloseIcon fontSize="inherit" />
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('tauri.closeConfirmTitle')}</DialogTitle>
        <DialogContent>
          <DialogContentText>{t('tauri.closeConfirmBody')}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} disabled={busy}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={async () => {
              setConfirmOpen(false);
              await confirmClose();
            }}
            disabled={busy}
            color="error"
            variant="contained"
          >
            {t('tauri.closeConfirmAction')}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={errorOpen}
        onClose={() => setErrorOpen(false)}
        autoHideDuration={5000}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setErrorOpen(false)} severity="error" variant="filled">
          {errorMessage || t('tauri.closeFailed')}
        </Alert>
      </Snackbar>
    </>
  );
}

