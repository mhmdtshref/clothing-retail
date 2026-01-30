'use client';

import * as React from 'react';

export default function RegisterSW() {
  React.useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    // Attach outbox sync listeners in both envs
    try {
      import('@/lib/offline/sync').then((m) => m.useOutboxSync && m.useOutboxSync());
    } catch {}

    const isProd = process.env.NODE_ENV === 'production';

    if (isProd) {
      const register = async () => {
        try {
          await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        } catch {
          // ignore
        }
      };
      register();
      return;
    }

    // In development: actively unregister any existing SW and clear caches to avoid stale HMR bundles
    (async () => {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      } catch {}
      try {
        if ('caches' in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        }
      } catch {}
    })();
  }, []);
  return null;
}
