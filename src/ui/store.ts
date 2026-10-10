import { useEffect, useReducer } from 'preact/hooks';
import { normalizeRoot } from '../core/completion';
import { emptyRoot, type Root } from '../core/schema';
import { nowIso } from '../core/time';
import { createSaver, load, onExternalChange, readLastExport, readMode, writeMode } from '../storage/local';
import { applyTheme, DEFAULT_THEME, onSystemAppearanceChange, readThemeChoice, saveThemeChoice, type ThemeChoice } from './themes';

export type View = { kind: 'project'; id: string } | { kind: 'backlog' } | { kind: 'auto' };

export type ConfirmRequest = {
  title: string;
  body?: string;
  confirmLabel: string;
  resolve: (ok: boolean) => void;
};

export type ImportState =
  | { kind: 'preview'; fileName: string; incoming: Root }
  | { kind: 'error'; fileName: string; error: string };

export type Toast = { id: number; text: string; action?: { label: string; run: () => void } };

export type Mode = 'overview' | 'timeline';

export type State = {
  root: Root;
  mode: Mode;
  /** The colour theme, per browser. */
  theme: ThemeChoice;
  /** False while writes are failing or storage is unavailable: shows the banner. */
  saving: boolean;
  notice: string | null;
  lastExportedAt: string | null;
  toast: Toast | null;
  view: View;
  expandedTaskId: string | null;
  drawerOpen: boolean;
  confirm: ConfirmRequest | null;
  capture: boolean;
  /** The day open in the Timeline's side panel, as "2026-10-04". */
  day: string | null;
  importState: ImportState | null;
};

let state: State = {
  root: emptyRoot(),
  mode: 'overview',
  theme: DEFAULT_THEME,
  saving: true,
  notice: null,
  lastExportedAt: null,
  toast: null,
  view: { kind: 'auto' },
  expandedTaskId: null,
  drawerOpen: false,
  confirm: null,
  capture: false,
  day: null,
  importState: null,
};

const listeners = new Set<() => void>();

export function getState(): State {
  return state;
}

export function set(patch: Partial<State>): void {
  state = { ...state, ...patch };
  for (const l of listeners) l();
}

export function useStore(): State {
  const [, force] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    const l = () => force(undefined);
    listeners.add(l);
    return () => void listeners.delete(l);
  }, []);
  return state;
}

// ─── Persistence ─────────────────────────────────────────────────────────────

let writesAllowed = false;
const saver = createSaver((ok) => {
  if (ok !== state.saving) set({ saving: ok });
});

/**
 * The only way data changes (§5): apply the completion rule, update memory,
 * re-render, then save after a short debounce. `touch: false` keeps the root
 * `updatedAt` as given (used by Replace import so a round trip is identical).
 */
export function commit(next: Root, opts: { touch?: boolean } = {}): void {
  const now = nowIso();
  let root = normalizeRoot(next, now);
  if (opts.touch !== false) root = { ...root, updatedAt: now };
  set({ root });
  if (writesAllowed) saver.schedule(root);
}

/** Run a core op against the current root and commit the result. */
export function update(fn: (root: Root, now: string) => Root): void {
  const current = state.root;
  const next = fn(current, nowIso());
  if (next !== current) commit(next);
}

export function init(): void {
  const loaded = load();
  // If load says saving is unsafe (unavailable, or a corrupt copy couldn't be
  // set aside), never write: the banner stays and nothing gets overwritten.
  writesAllowed = loaded.canSave;
  set({
    root: loaded.root,
    mode: readMode() ?? 'overview',
    theme: readThemeChoice(),
    saving: loaded.canSave,
    notice: loaded.notice ?? null,
    lastExportedAt: readLastExport(),
  });
  applyTheme(state.theme);
  onSystemAppearanceChange(() => applyTheme(state.theme));

  onExternalChange((change) => {
    if (change.kind === 'lastExport') {
      set({ lastExportedAt: change.value });
      return;
    }
    // The other tab wrote newer data; ours would only clobber it.
    saver.cancel();
    set({ root: change.root });
    toast('Updated from another tab');
  });

  const flush = () => saver.flush();
  addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
}

/** Overview or Timeline, remembered per browser. */
export function setMode(mode: Mode): void {
  if (mode === state.mode) return;
  set({ mode, drawerOpen: false, day: null });
  writeMode(mode);
}

/** The colour theme and light/dark choice, remembered per browser. */
export function setTheme(theme: ThemeChoice): void {
  set({ theme });
  saveThemeChoice(theme);
  applyTheme(theme);
}

// ─── Toasts & confirmations ──────────────────────────────────────────────────

let toastSeq = 0;

export function toast(text: string, action?: Toast['action'], ms = 4000): void {
  const id = ++toastSeq;
  set({ toast: { id, text, action } });
  setTimeout(() => {
    if (state.toast?.id === id) set({ toast: null });
  }, ms);
}

/**
 * Apply a change and offer Undo for a few seconds. Undo only restores the
 * earlier root if nothing else has changed since, so it can't clobber later work.
 */
export function updateWithUndo(text: string, fn: (root: Root, now: string) => Root): void {
  const before = state.root;
  update(fn);
  const after = state.root;
  if (after === before) return;
  toast(text, {
    label: 'Undo',
    run: () => {
      if (state.root === after) commit(before);
      set({ toast: null });
    },
  }, 6000);
}

export function confirmAction(req: Omit<ConfirmRequest, 'resolve'>): Promise<boolean> {
  return new Promise((resolve) => {
    set({
      confirm: {
        ...req,
        resolve: (ok) => {
          set({ confirm: null });
          resolve(ok);
        },
      },
    });
  });
}
