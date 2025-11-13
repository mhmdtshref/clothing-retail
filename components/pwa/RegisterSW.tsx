'use client';

import * as React from 'react';

export default function RegisterSW() {
  React.useEffect(() => {
    if ('serviceWorker' in navigator) {
      // also attach outbox sync listeners
      try {
        import('@/lib/offline/sync').then((m) => m.useOutboxSync && m.useOutboxSync());
      } catch {}
      const register = async () => {
        try {
          await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        } catch {
          // ignore
        }
      };
      register();
    }
  }, []);
  return null;
}


