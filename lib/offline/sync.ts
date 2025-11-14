import { db, type OutboxItem } from '@/lib/db/dexie';

export async function enqueueReceipt(payload: any) {
  try {
    await db.addOutbox({ type: 'receipt', payload, createdAt: Date.now(), retries: 0 });
  } catch {}
}

export async function enqueuePayment(receiptId: string, body: any) {
  try {
    await db.addOutbox({ type: 'payment', payload: { receiptId, body }, createdAt: Date.now(), retries: 0 });
  } catch {}
}

export async function flushOutbox() {
  try {
    const items = await db.readOutbox(25);
    for (const it of items) {
      try {
        if (it.type === 'receipt') {
          const res = await fetch('/api/receipts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(it.payload) });
          if (!res.ok) throw new Error(String(res.status));
        } else if (it.type === 'payment') {
          const id = encodeURIComponent(String(it.payload.receiptId));
          const res = await fetch(`/api/receipts/${id}/payments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(it.payload.body) });
          if (!res.ok) throw new Error(String(res.status));
        }
        await db.deleteOutbox((it as any).id);
      } catch {
        // keep for later
      }
    }
  } catch {}
}

export function useOutboxSync() {
  // client-only hook
  if (typeof window === 'undefined') return;
  const handler = () => flushOutbox();
  window.addEventListener('online', handler);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') flushOutbox();
  });
  // initial flush
  flushOutbox();
}


