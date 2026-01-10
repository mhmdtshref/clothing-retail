'use client';

import * as React from 'react';
import AppSidebar from '@/components/navigation/AppSidebar';

type AppDrawerProps = {
  open: boolean;
  onClose: () => void;
};

export default function AppDrawer({ open, onClose }: AppDrawerProps) {
  return <AppSidebar variant="temporary" open={open} onClose={onClose} closeOnNavigate />;
}


