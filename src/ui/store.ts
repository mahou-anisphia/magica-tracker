import { useEffect, useReducer } from 'preact/hooks';
import { normalizeRoot } from '../core/completion';
import { emptyRoot, type Root } from '../core/schema';
import { emptyTeam, type Team, type TeamFileRead } from '../core/team';
import { nowIso } from '../core/time';
import { loadData, type Backend } from '../storage/data';
import { teamStore, type TeamStore } from '../storage/team';
import { createSaver, onLastExportChange, readLastExport, readMode, writeMode } from '../storage/local';
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

/**
 * Files brought in on the Team screen, one row each. `assign` is a member id,
 * 'new' (add the person the file names), 'skip', or '' (not chosen yet).
 */
export type TeamImportRow = { key: string; read: TeamFileRead; assign: string };

export type Toast = { id: number; text: string; action?: { label: string; run: () => void } };

/**
 * Which screen is showing. Overview and Timeline are the everyday views and
 * are remembered per browser; the rest are reached from the orb or the palette.
 */
export type Mode = 'overview' | 'timeline' | 'board' | 'allocation' | 'timelog' | 'settings' | 'team' | 'observatory' | 'member';

/**
 * A part of a screen to point at for a moment, after an orb or palette action
 * ("Add member" lands on Team with the add form highlighted).
 */
export type Highlight = { key: string; hint?: string };

export type State = {
  /** False until the saved data has loaded; nothing renders before. */
  ready: boolean;
  /** Where the data is kept, for Settings. */
  storage: { backend: Backend; migratedAt?: string } | null;
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
  /** Whether that panel opens with its "Add to this day" form showing. */
  adding: boolean;
  importState: ImportState | null;
  highlight: Highlight | null;
  /** The ⌘K / Ctrl+K search palette. */
  palette: boolean;
  /** The people you follow, with their latest files. Kept apart from `root`. */
  team: Team;
  teamImport: TeamImportRow[] | null;
  /** Whose read-only tracker "View as" shows, when mode is 'member'. */
  memberId: string | null;
};

let state: State = {
  ready: false,
  storage: null,
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
  adding: false,
  importState: null,
  highlight: null,
  palette: false,
  team: emptyTeam(),
  teamImport: null,
  memberId: null,
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
  const rendered = state;
  useEffect(() => {
    const l = () => force(undefined);
    listeners.add(l);
    // Effects run after paint: anything set before now (the data loading
    // quickly, say) had no listener to hear it, so catch up once.
    if (state !== rendered) l();
    return () => void listeners.delete(l);
  }, []);
  return state;
}

// ─── Persistence ─────────────────────────────────────────────────────────────

let writesAllowed = false;
let write: (text: string) => Promise<void> | void = () => {
  throw new Error('Not loaded yet');
};
const saver = createSaver(
  (text) => write(text),
  (ok) => {
    if (ok !== state.saving) set({ saving: ok });
  },
);

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

let teams: TeamStore | null = null;

/** Changes the team and saves it straight away (it changes rarely, and in whole steps). */
export function setTeam(team: Team): void {
  if (team === state.team) return;
  set({ team });
  teams?.save(team).catch(() => toast("Couldn't save the team in this browser."));
}

/** Loads the saved data (IndexedDB, or localStorage) and starts saving. */
export async function init(): Promise<void> {
  // Preferences are synchronous, so the theme is right before the data arrives.
  set({ mode: readMode() ?? 'overview', theme: readThemeChoice() });
  applyTheme(state.theme);
  onSystemAppearanceChange(() => applyTheme(state.theme));

  const loaded = await loadData();
  const p = loaded.persistence;
  // If load says saving is unsafe (a corrupt copy couldn't be set aside), never
  // write: the banner stays and nothing gets overwritten.
  writesAllowed = loaded.canSave;
  write = p.write;
  teams = teamStore(p.kv);
  const loadedTeam = await teams.load();
  set({
    ready: true,
    storage: { backend: p.backend, migratedAt: p.migratedAt },
    root: loaded.root,
    saving: loaded.canSave,
    notice: loaded.notice ?? loadedTeam.notice ?? null,
    team: loadedTeam.team,
    lastExportedAt: readLastExport(),
  });

  p.onExternalChange((root) => {
    // The other tab saved newer data; ours would only clobber it.
    saver.cancel();
    set({ root });
    toast('Updated from another tab');
  });
  teams.onExternalChange((team) => set({ team }));
  onLastExportChange((value) => set({ lastExportedAt: value }));

  const flush = () => saver.flush();
  addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
}

/** Switch screens. Overview and Timeline are remembered per browser. */
export function setMode(mode: Mode): void {
  if (mode === state.mode) return;
  set({ mode, drawerOpen: false, day: null, adding: false });
  if (mode === 'overview' || mode === 'timeline') writeMode(mode);
}

/** How long an arrival highlight pulses before it fades. */
const HIGHLIGHT_MS = 3600;
let highlightTimer: ReturnType<typeof setTimeout> | undefined;

/** Go to a screen and, optionally, point at the part to use there for a moment. */
export function go(mode: Mode, highlight?: Highlight): void {
  setMode(mode);
  clearTimeout(highlightTimer);
  set({ highlight: highlight ?? null, palette: false });
  if (highlight) highlightTimer = setTimeout(() => set({ highlight: null }), HIGHLIGHT_MS);
  // New screens start at the top; then scroll only as far as the highlighted part needs.
  scrollTo({ top: 0 });
  requestAnimationFrame(() => {
    const el = highlight && document.querySelector<HTMLElement>(`[data-highlight="${CSS.escape(highlight.key)}"]`);
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });
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
