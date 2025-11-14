'use client';

import * as React from 'react';
import { Drawer, Box, List, ListItemButton, ListItemIcon, ListItemText, Divider } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import StoreIcon from '@mui/icons-material/Store';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import LocalMallIcon from '@mui/icons-material/LocalMall';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import BusinessIcon from '@mui/icons-material/Business';
import PaymentsIcon from '@mui/icons-material/Payments';
import DashboardIcon from '@mui/icons-material/Dashboard';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useI18n } from '@/components/i18n/useI18n';

type AppDrawerProps = {
  open: boolean;
  onClose: () => void;
};

export default function AppDrawer({ open, onClose }: AppDrawerProps) {
  const { t } = useI18n();
  const pathname = usePathname() || '';

  const items = [
    { href: '/', icon: <HomeIcon />, label: t('nav.home') },
    { href: '/dashboard', icon: <DashboardIcon />, label: t('nav.dashboard') },
    { href: '/products', icon: <Inventory2Icon />, label: t('nav.products') },
    { href: '/companies', icon: <BusinessIcon />, label: t('nav.companies') },
    { href: '/expenses', icon: <PaymentsIcon />, label: t('nav.expenses') },
    { href: '/receipts/new', icon: <ReceiptLongIcon />, label: t('nav.newPurchase') },
    { href: '/delivery/new', icon: <LocalShippingIcon />, label: t('nav.delivery') },
    { href: '/pos', icon: <StoreIcon />, label: t('nav.pos') },
  ];

  return (
    <Drawer anchor="left" open={open} onClose={onClose}>
      <Box
        role="presentation"
        sx={{ width: 300, maxWidth: '90vw', pt: 2, pb: 'calc(8px + env(safe-area-inset-bottom, 0px))' }}
        onClick={onClose}
        onKeyDown={onClose}
      >
        <List>
          {items.map((item) => {
            const selected = pathname === item.href;
            return (
              <ListItemButton
                key={item.href}
                component={Link}
                href={item.href}
                selected={selected}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            );
          })}
        </List>
        <Divider />
        <List>
          <ListItemButton component={Link} href="/shop">
            <ListItemIcon><LocalMallIcon /></ListItemIcon>
            <ListItemText primary={t('nav.shop',) || 'Shop'} />
          </ListItemButton>
        </List>
      </Box>
    </Drawer>
  );
}


