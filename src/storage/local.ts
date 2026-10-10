import { emptyRoot, type Root } from '../core/schema';
import { parseRootText } from '../core/validate';

export const STORAGE_KEY = 'magica:v1';
export const LAST_EXPORT_KEY = 'magica:v1:lastExportedAt';
const PROBE_KEY = 'magica:probe';
const SAVE_DELAY_MS = 300;

/** localStorage if it is usable right now, else null. Never throws. */
function storage(): Storage | null {
  try {
    const s = globalThis.localStorage;
    s.setItem(PROBE_KEY, '1');
    s.removeItem(PROBE_KEY);
    return s;
  } catch {
    return null;
  }
}

export type LoadResult = {
  root: Root;
  /** False when nothing can be saved; the app runs in memory. */
  canSave: boolean;
  /** Something the person should know about what happened on load. */
  notice?: string;
};

export function load(): LoadResult {
  const s = storage();
  if (!s) return { root: emptyRoot(), canSave: false };

  let raw: string | null;
  try {
    raw = s.getItem(STORAGE_KEY);
  } catch {
    return { root: emptyRoot(), canSave: false };
  }
  if (raw === null) return { root: emptyRoot(), canSave: true };

  const parsed = parseRootText(raw);
  if (parsed.ok) return { root: parsed.root, canSave: true };

  // Corrupt: set the raw string aside before anything can overwrite it.
  const backupKey = `magica:corrupt:${new Date().toISOString()}`;
  try {
    s.setItem(backupKey, raw);
  } catch {
    // Could not keep a copy, so saving over the original would lose it for good.
    return {
      root: emptyRoot(),
      canSave: false,
      notice: `Saved data couldn't be read (${parsed.error}) and there was no room to set it aside, so saving is paused to protect it.`,
    };
  }
  return {
    root: emptyRoot(),
    canSave: true,
    notice: `Saved data couldn't be read (${parsed.error}). It was kept under “${backupKey}” in this browser's storage, and the tracker started fresh.`,
  };
}

/**
 * Debounced writer. Reports every outcome so the "Not saving" banner tracks
 * reality: it appears on a failed write and clears once a write succeeds.
 */
export function createSaver(onResult: (ok: boolean) => void, delay = SAVE_DELAY_MS) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pending: Root | null = null;

  const write = () => {
    clearTimeout(timer);
    timer = undefined;
    if (!pending) return;
    const root = pending;
    pending = null;
    try {
      globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(root));
      onResult(true);
    } catch {
      onResult(false);
    }
  };

  return {
    schedule(root: Root) {
      pending = root;
      clearTimeout(timer);
      timer = setTimeout(write, delay);
    },
    /** Write now if something is waiting (e.g. the page is being hidden). */
    flush: write,
    /** Drop a pending write (another tab's newer data replaced ours). */
    cancel() {
      clearTimeout(timer);
      timer = undefined;
      pending = null;
    },
  };
}

export function readLastExport(): string | null {
  try {
    return globalThis.localStorage.getItem(LAST_EXPORT_KEY);
  } catch {
    return null;
  }
}

export function writeLastExport(iso: string): void {
  try {
    globalThis.localStorage.setItem(LAST_EXPORT_KEY, iso);
  } catch {
    // The banner already covers unavailable storage.
  }
}

const MODE_KEY = 'magica:v1:mode';

/** A per-browser view preference; not part of the data or its exports. */
export type StoredMode = 'overview' | 'timeline';

export function readMode(): StoredMode | null {
  try {
    const v = globalThis.localStorage.getItem(MODE_KEY);
    return v === 'overview' || v === 'timeline' ? v : null;
  } catch {
    return null;
  }
}

export function writeMode(mode: StoredMode): void {
  try {
    globalThis.localStorage.setItem(MODE_KEY, mode);
  } catch {
    // Only a convenience.
  }
}

const THEME_KEY = 'magica:v1:theme';

/**
 * The theme choice, per browser like the view mode. `light` and `dark` are the
 * palettes the choice resolves to, so index.html can set the right one before
 * the first paint without knowing the theme list. Shape-checked by the caller.
 */
export type StoredTheme = { theme: string; appearance: string; light: string; dark: string };

export function readTheme(): Partial<StoredTheme> | null {
  try {
    const v = JSON.parse(globalThis.localStorage.getItem(THEME_KEY) ?? 'null');
    return v && typeof v === 'object' ? v : null;
  } catch {
    return null;
  }
}

export function writeTheme(theme: StoredTheme): void {
  try {
    globalThis.localStorage.setItem(THEME_KEY, JSON.stringify(theme));
  } catch {
    // Only a convenience.
  }
}

export type ExternalChange = { kind: 'data'; root: Root } | { kind: 'lastExport'; value: string | null };

/**
 * Another tab wrote to storage. Only valid data is passed on; anything else is
 * ignored rather than replacing good in-memory state.
 */
export function onExternalChange(handler: (change: ExternalChange) => void): () => void {
  const listener = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY && e.newValue !== null) {
      const parsed = parseRootText(e.newValue);
      if (parsed.ok) handler({ kind: 'data', root: parsed.root });
    } else if (e.key === LAST_EXPORT_KEY) {
      handler({ kind: 'lastExport', value: e.newValue });
    }
  };
  globalThis.addEventListener('storage', listener);
  return () => globalThis.removeEventListener('storage', listener);
}
