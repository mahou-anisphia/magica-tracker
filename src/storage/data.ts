import { emptyRoot, type Root } from '../core/schema';
import { nowIso } from '../core/time';
import { parseRootText } from '../core/validate';
import { openKv, type Kv } from './idb';
import { hasLocalData, loadLocal, onLocalDataChange, writeLocal, type LoadResult } from './local';

/**
 * Where the tracker keeps its data. IndexedDB when the browser offers it; the
 * first time, whatever was in localStorage is copied across and the old copy
 * is left where it was, as a backup. Without IndexedDB, localStorage as before.
 * The data is the same JSON either way.
 */
export type Backend = 'indexeddb' | 'localStorage';

export type Persistence = {
  backend: Backend;
  /** When the localStorage data was copied into IndexedDB, if it was. */
  migratedAt?: string;
  /** Saves the root's JSON text. Rejects or throws when the write fails. */
  write(text: string): Promise<void> | void;
  /** Another tab saved newer data. */
  onExternalChange(handler: (root: Root) => void): void;
  /** The same store, for other records (the team). Null on localStorage. */
  kv: Kv | null;
};

export type DataLoad = LoadResult & { persistence: Persistence };

const ROOT_KEY = 'root';
const MIGRATED_KEY = 'migratedFromLocalStorageAt';
const CHANNEL = 'magica:data';

function localPersistence(): Persistence {
  return { backend: 'localStorage', write: writeLocal, onExternalChange: onLocalDataChange, kv: null };
}

function idbPersistence(kv: Kv, migratedAt: string | undefined): Persistence {
  // IndexedDB has no storage event, so tabs tell each other what they saved.
  const channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel(CHANNEL) : null;
  return {
    backend: 'indexeddb',
    migratedAt,
    kv,
    async write(text) {
      await kv.put(ROOT_KEY, text);
      channel?.postMessage(text);
    },
    onExternalChange(handler) {
      if (!channel) return;
      channel.onmessage = (e: MessageEvent) => {
        if (typeof e.data !== 'string') return;
        const parsed = parseRootText(e.data);
        if (parsed.ok) handler(parsed.root);
      };
    },
  };
}

export async function loadData(factory: IDBFactory | undefined = globalThis.indexedDB): Promise<DataLoad> {
  const kv = await openKv(factory);
  if (!kv) return { ...loadLocal(), persistence: localPersistence() };

  let raw: unknown;
  let migratedAt: string | undefined;
  try {
    raw = await kv.get(ROOT_KEY);
    migratedAt = await kv.get<string>(MIGRATED_KEY);
  } catch {
    return { ...loadLocal(), persistence: localPersistence() };
  }

  if (typeof raw === 'string') {
    const parsed = parseRootText(raw);
    if (parsed.ok) return { root: parsed.root, canSave: true, persistence: idbPersistence(kv, migratedAt) };
    // Corrupt: set it aside before anything can overwrite it.
    const key = `corrupt:${nowIso()}`;
    try {
      await kv.put(key, raw);
    } catch {
      return {
        root: emptyRoot(),
        canSave: false,
        notice: `Saved data couldn't be read (${parsed.error}) and couldn't be set aside, so saving is paused to protect it.`,
        persistence: idbPersistence(kv, migratedAt),
      };
    }
    return {
      root: emptyRoot(),
      canSave: true,
      notice: `Saved data couldn't be read (${parsed.error}). It was kept under “${key}” in this browser's database, and the tracker started fresh.`,
      persistence: idbPersistence(kv, migratedAt),
    };
  }

  // First run on IndexedDB: bring the localStorage data across. The original
  // stays in localStorage untouched, as a backup.
  const hadLocal = hasLocalData();
  const legacy = loadLocal();
  const notice =
    legacy.notice && !legacy.canSave
      ? "Saved data in this browser's local storage couldn't be read. It was left untouched, and the tracker started fresh."
      : legacy.notice;
  try {
    await kv.put(ROOT_KEY, JSON.stringify(legacy.root));
    if (hadLocal) {
      migratedAt = nowIso();
      await kv.put(MIGRATED_KEY, migratedAt);
    }
  } catch {
    return { ...legacy, persistence: localPersistence() };
  }
  return { root: legacy.root, canSave: true, notice, persistence: idbPersistence(kv, migratedAt) };
}
