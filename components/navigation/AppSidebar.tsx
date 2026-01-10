'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from '@mui/material/styles';
import {
  Drawer,
  Box,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Tooltip,
  IconButton,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';

import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import LoginIcon from '@mui/icons-material/Login';
import HomeIcon from '@mui/icons-material/Home';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import StoreIcon from '@mui/icons-material/Store';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import BusinessIcon from '@mui/icons-material/Business';
import PaymentsIcon from '@mui/icons-material/Payments';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PendingActionsIcon from '@mui/icons-material/PendingActions';

import { SignedIn, SignedOut, UserButton } from '@clerk/nextjs';
import { useI18n } from '@/components/i18n/useI18n';

type NavItem = {
  href: string;
  icon: React.ReactNode;
  label: string;
};

export type AppSidebarProps = {
  variant: 'permanent' | 'temporary';
  open?: boolean;
  onClose?: () => void;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  expandedWidth?: number;
  collapsedWidth?: number;
  closeOnNavigate?: boolean;
};

function isItemSelected(pathname: string, href: string) {
  if (!pathname) return false;
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AppSidebar({
  variant,
  open,
  onClose,
  collapsed = false,
  onToggleCollapsed,
  expandedWidth = 300,
  collapsedWidth = 72,
  closeOnNavigate = false,
}: AppSidebarProps) {
  const theme = useTheme();
  const { locale, setLocale, t } = useI18n();
  const pathname = usePathname() || '';
  const anchor: 'left' | 'right' = theme.direction === 'rtl' ? 'right' : 'left';
  const width = collapsed ? collapsedWidth : expandedWidth;
  const langValue = (locale || 'en').split('-')[0];

  const items: NavItem[] = [
    { href: '/', icon: <HomeIcon />, label: t('nav.home') },
    { href: '/dashboard', icon: <DashboardIcon />, label: t('nav.dashboard') },
    { href: '/products', icon: <Inventory2Icon />, label: t('nav.products') },
    { href: '/companies', icon: <BusinessIcon />, label: t('nav.companies') },
    { href: '/expenses', icon: <PaymentsIcon />, label: t('nav.expenses') },
    { href: '/receipts/new', icon: <ReceiptLongIcon />, label: t('nav.newPurchase') },
    { href: '/receipts/deposits', icon: <PendingActionsIcon />, label: t('nav.depositReceipts') },
    { href: '/delivery/new', icon: <LocalShippingIcon />, label: t('nav.delivery') },
    { href: '/pos', icon: <StoreIcon />, label: t('nav.pos') },
    { href: '/pos/deposits', icon: <PendingActionsIcon />, label: t('nav.depositReceiptsPos') },
  ];

  const showCollapseToggle = variant === 'permanent' && typeof onToggleCollapsed === 'function';
  const chevron = collapsed
    ? (anchor === 'left' ? <ChevronRightIcon /> : <ChevronLeftIcon />)
    : (anchor === 'left' ? <ChevronLeftIcon /> : <ChevronRightIcon />);
  const tooltipSide: 'left' | 'right' = anchor === 'left' ? 'right' : 'left';

  const handleItemClick = React.useCallback(() => {
    if (variant === 'temporary' && closeOnNavigate) onClose?.();
  }, [variant, closeOnNavigate, onClose]);

  const handleLang = React.useCallback(
    (_e: unknown, next: string | null) => {
      if (!next) return;
      if (next === langValue) return;
      try {
        document.cookie = `lang=${encodeURIComponent(next)}; path=/; max-age=31536000`;
      } catch {}
      setLocale?.(next);
    },
    [langValue, setLocale],
  );

  const content = (
    <Box
      role="navigation"
      aria-label="Sidebar navigation"
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        pt: 'calc(8px + env(safe-area-inset-top, 0px))',
        pb: 'calc(8px + env(safe-area-inset-bottom, 0px))',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          gap: 1,
          px: collapsed ? 0 : 2,
          minHeight: 56,
        }}
      >
        {!collapsed && (
          <Typography
            variant="subtitle1"
            sx={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          >
            {process.env.NEXT_PUBLIC_SHOP_NAME || t('nav.appTitle')}
          </Typography>
        )}
        {showCollapseToggle && (
          <IconButton
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleCollapsed?.();
            }}
            size="small"
          >
            {chevron}
          </IconButton>
        )}
      </Box>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          px: collapsed ? 1 : 2,
          pb: 1,
        }}
      >
        <ToggleButtonGroup
          size="small"
          exclusive
          orientation={collapsed ? 'vertical' : 'horizontal'}
          value={langValue}
          onChange={handleLang}
          aria-label="Language"
        >
          <ToggleButton value="en">EN</ToggleButton>
          <ToggleButton value="ar">AR</ToggleButton>
        </ToggleButtonGroup>
      </Box>
      <Divider />
      <Box sx={{ flex: 1, overflowY: 'auto' }}>
        <List sx={{ py: 1 }}>
          {items.map((item) => {
            const selected = isItemSelected(pathname, item.href);
            const btn = (
              <ListItemButton
                key={item.href}
                component={Link}
                href={item.href}
                selected={selected}
                onClick={handleItemClick}
                aria-label={collapsed ? item.label : undefined}
                sx={{
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  px: collapsed ? 1 : 2,
                }}
              >
                <ListItemIcon sx={{ minWidth: collapsed ? 0 : 40, justifyContent: 'center' }}>{item.icon}</ListItemIcon>
                {!collapsed && <ListItemText primary={item.label} />}
              </ListItemButton>
            );

            if (!collapsed) return btn;
            return (
              <Tooltip key={item.href} title={item.label} placement={tooltipSide}>
                <Box component="span">{btn}</Box>
              </Tooltip>
            );
          })}
        </List>
      </Box>
      <Divider />
      <Box
        sx={{
          display: 'flex',
          justifyContent: collapsed ? 'center' : 'flex-start',
          px: collapsed ? 1 : 2,
          pt: 1,
        }}
      >
        <SignedIn>
          <UserButton />
        </SignedIn>
        <SignedOut>
          {collapsed ? (
            <Tooltip title={t('nav.signIn')} placement={tooltipSide}>
              <ListItemButton
                component={Link}
                href="/sign-in"
                onClick={handleItemClick}
                sx={{ justifyContent: 'center', px: 1 }}
                aria-label={t('nav.signIn')}
              >
                <ListItemIcon sx={{ minWidth: 0, justifyContent: 'center' }}>
                  <LoginIcon />
                </ListItemIcon>
              </ListItemButton>
            </Tooltip>
          ) : (
            <ListItemButton component={Link} href="/sign-in" onClick={handleItemClick}>
              <ListItemIcon>
                <LoginIcon />
              </ListItemIcon>
              <ListItemText primary={t('nav.signIn')} />
            </ListItemButton>
          )}
        </SignedOut>
      </Box>
    </Box>
  );

  return (
    <Drawer
      anchor={anchor}
      variant={variant}
      open={variant === 'temporary' ? Boolean(open) : true}
      onClose={onClose}
      ModalProps={variant === 'temporary' ? { keepMounted: true } : undefined}
      sx={{
        width,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width,
          maxWidth: '90vw',
          overflowX: 'hidden',
          boxSizing: 'border-box',
          ...(variant === 'permanent'
            ? { position: 'sticky', top: 0, height: '100dvh' }
            : undefined),
        },
      }}
    >
      {content}
    </Drawer>
  );
}

