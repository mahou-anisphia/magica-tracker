/**
 * A tiny key-value store on IndexedDB: one database, one object store. Values
 * are whatever the structured clone allows; the app stores JSON text for its
 * data so validation stays the same as for files.
 */

const DB_NAME = 'magica';
const DB_VERSION = 1;
const STORE = 'kv';

export type Kv = {
  get<T = unknown>(key: string): Promise<T | undefined>;
  put(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<void>;
};

function request<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

/**
 * Opens the store, or resolves null when IndexedDB is missing or refuses
 * (some private modes, blocked site data). Never rejects.
 */
export function openKv(factory: IDBFactory | undefined = globalThis.indexedDB): Promise<Kv | null> {
  if (!factory) return Promise.resolve(null);
  return new Promise((resolve) => {
    let open: IDBOpenDBRequest;
    try {
      open = factory.open(DB_NAME, DB_VERSION);
    } catch {
      resolve(null);
      return;
    }
    open.onupgradeneeded = () => {
      if (!open.result.objectStoreNames.contains(STORE)) open.result.createObjectStore(STORE);
    };
    open.onerror = () => resolve(null);
    open.onblocked = () => resolve(null);
    open.onsuccess = () => {
      const db = open.result;
      const tx = (mode: IDBTransactionMode) => db.transaction(STORE, mode).objectStore(STORE);
      resolve({
        get: <T>(key: string) => request(tx('readonly').get(key)) as Promise<T | undefined>,
        put: (key, value) => request(tx('readwrite').put(value, key)).then(() => undefined),
        delete: (key) => request(tx('readwrite').delete(key)).then(() => undefined),
      });
    };
  });
}
