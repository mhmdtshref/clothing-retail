'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { Container, Box, IconButton } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { useI18n } from '@/components/i18n/useI18n';
import InstallPrompt from '@/components/pwa/InstallPrompt';
import AppDrawer from '@/components/navigation/AppDrawer';
import AppSidebar from '@/components/navigation/AppSidebar';

export default function LayoutShell({ children }) {
  const { t } = useI18n();
  const pathname = usePathname();
  const pathSegments = (pathname || '').split('/').filter(Boolean);
  const isPOS = pathSegments.includes('pos');
  const isDelivery = pathSegments.includes('delivery');
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [sidebarPrefReady, setSidebarPrefReady] = React.useState(false);
  const SIDEBAR_EXPANDED = 300;
  const SIDEBAR_COLLAPSED = 72;
  const desktopSidebarWidth = sidebarCollapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED;

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

  // Restore sidebar collapse preference
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem('sidebarCollapsed');
      if (raw != null) {
        setSidebarCollapsed(raw === '1' || raw === 'true');
      }
    } catch {}
    setSidebarPrefReady(true);
  }, []);

  // Persist sidebar collapse preference
  React.useEffect(() => {
    if (!sidebarPrefReady) return;
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem('sidebarCollapsed', sidebarCollapsed ? '1' : '0');
    } catch {}
  }, [sidebarCollapsed, sidebarPrefReady]);

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100dvh',
        bgcolor: 'background.default',
        width: '100%',
        maxWidth: '100vw',
      }}
    >
      {/* Desktop sidebar */}
      <Box
        sx={{
          display: { xs: 'none', md: 'block' },
          width: desktopSidebarWidth,
          flexShrink: 0,
          transition: 'width 180ms ease',
        }}
      >
        <AppSidebar
          variant="permanent"
          collapsed={sidebarCollapsed}
          onToggleCollapsed={() => setSidebarCollapsed((v) => !v)}
          expandedWidth={SIDEBAR_EXPANDED}
          collapsedWidth={SIDEBAR_COLLAPSED}
        />
      </Box>

      {/* Mobile drawer */}
      <AppDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* Main content column */}
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        {/* Mobile menu button (no header; doesn't take vertical space) */}
        <Box
          sx={{
            position: 'fixed',
            top: 'calc(8px + env(safe-area-inset-top, 0px))',
            insetInlineStart: 8,
            zIndex: (theme) => theme.zIndex.drawer + 2,
            display: { xs: 'block', md: 'none' },
          }}
        >
          <IconButton
            aria-label="Open navigation menu"
            onClick={() => setDrawerOpen(true)}
            sx={{
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: 1,
            }}
          >
            <MenuIcon />
          </IconButton>
        </Box>

        {mounted && !online && (
          <Box
            sx={{
              bgcolor: 'warning.light',
              color: 'warning.contrastText',
              textAlign: 'center',
              py: 0.5,
            }}
          >
            {t('status.offline')}
          </Box>
        )}

        {isPOS || isDelivery ? (
          <Box component="main" sx={{ width: '100%', flexGrow: 1, minWidth: 0, p: 0, m: 0 }}>
            {children}
          </Box>
        ) : (
          <Container component="main" maxWidth="lg" sx={{ py: 3, width: '100%', flexGrow: 1 }}>
            {children}
          </Container>
        )}
        <InstallPrompt />
      </Box>
    </Box>
  );
}
