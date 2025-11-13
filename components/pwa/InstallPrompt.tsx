'use client';

import * as React from 'react';
import { Snackbar, Button } from '@mui/material';

export default function InstallPrompt() {
  const [deferred, setDeferred] = React.useState<any>(null);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferred(e);
      setOpen(true);
    };
    window.addEventListener('beforeinstallprompt', handler as any);
    return () => window.removeEventListener('beforeinstallprompt', handler as any);
  }, []);

  const install = async () => {
    try {
      const d = deferred;
      if (!d) return;
      d.prompt();
      await d.userChoice;
    } finally {
      setOpen(false);
      setDeferred(null);
    }
  };

  // Hide on iOS/installed
  React.useEffect(() => {
    const isStandalone = (window.navigator as any).standalone || window.matchMedia('(display-mode: standalone)').matches;
    if (isStandalone) setOpen(false);
  }, []);

  return (
    <Snackbar
      open={open}
      onClose={() => setOpen(false)}
      message="Install this app for quicker access"
      action={<Button color="secondary" size="small" onClick={install}>Install</Button>}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    />
  );
}


