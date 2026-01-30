// A tiny IndexedDB helper without external deps (Dexie-like shape)
export type OutboxItem =
  | { id?: number; type: 'receipt'; payload: any; createdAt: number; retries: number }
  | {
      id?: number;
      type: 'payment';
      payload: { receiptId: string; body: any };
      createdAt: number;
      retries: number;
    };

const DB_NAME = 'pos-db';
const DB_VERSION = 1;
const STORES = ['products', 'variants', 'cart', 'outbox'] as const;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('products'))
        db.createObjectStore('products', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('variants'))
        db.createObjectStore('variants', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('cart')) db.createObjectStore('cart', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('outbox'))
        db.createObjectStore('outbox', { keyPath: 'id', autoIncrement: true });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T = any>(
  store: (typeof STORES)[number],
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => Promise<T> | T,
): Promise<T> {
  const db = await openDB();
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction([store], mode);
    const s = t.objectStore(store);
    Promise.resolve(fn(s))
      .then((res) => {
        t.oncomplete = () => resolve(res);
        t.commit?.();
      })
      .catch((err) => {
        try {
          t.abort();
        } catch {}
        reject(err);
      });
    t.onerror = () => reject(t.error);
  });
}

export const db = {
  async saveCart(data: any) {
    return tx('cart', 'readwrite', (s) => {
      return new Promise((resolve, reject) => {
        const req = s.put({ id: 'singleton', data, updatedAt: Date.now() });
        req.onsuccess = () => resolve(true as any);
        req.onerror = () => reject(req.error);
      });
    });
  },
  async loadCart(): Promise<any | null> {
    return tx('cart', 'readonly', (s) => {
      return new Promise((resolve, reject) => {
        const req = s.get('singleton');
        req.onsuccess = () => resolve(req.result?.data || null);
        req.onerror = () => reject(req.error);
      });
    });
  },
  async addOutbox(item: OutboxItem) {
    const withMeta = {
      ...item,
      createdAt: item.createdAt || Date.now(),
      retries: item.retries ?? 0,
    };
    return tx('outbox', 'readwrite', (s) => {
      return new Promise<number>((resolve, reject) => {
        const req = s.add(withMeta);
        req.onsuccess = () => resolve(Number(req.result));
        req.onerror = () => reject(req.error);
      });
    });
  },
  async readOutbox(limit = 20): Promise<OutboxItem[]> {
    return tx('outbox', 'readonly', (s) => {
      return new Promise((resolve, reject) => {
        const items: any[] = [];
        const req = s.openCursor();
        req.onsuccess = () => {
          const cursor = req.result;
          if (cursor && items.length < limit) {
            items.push({ id: cursor.primaryKey as number, ...(cursor.value as any) });
            cursor.continue();
          } else {
            resolve(items);
          }
        };
        req.onerror = () => reject(req.error);
      });
    });
  },
  async deleteOutbox(id: number) {
    return tx('outbox', 'readwrite', (s) => {
      return new Promise((resolve, reject) => {
        const req = s.delete(id);
        req.onsuccess = () => resolve(true as any);
        req.onerror = () => reject(req.error);
      });
    });
  },
};
