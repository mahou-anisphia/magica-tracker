import { useEffect, useState } from 'preact/hooks';
import type { Root } from '../core/schema';
import { focusShortcut } from './actions';
import { Attention } from './components/Attention';
import { BacklogView } from './components/BacklogView';
import { CaptureDialog, ConfirmDialog, ImportDialog } from './components/Dialogs';
import { TodayHeading, TopBar } from './components/Header';
import { Banners, ToastRegion } from './components/Notices';
import { ProjectView } from './components/ProjectView';
import { Sidebar } from './components/Sidebar';
import { Timeline } from './components/Timeline';
import { getState, set, setMode, useStore, type View } from './store';

/** A missing or deleted project falls back to the first active one. */
function resolveView(view: View, root: Root): View {
  if (view.kind === 'backlog') return view;
  if (view.kind === 'project' && root.projects.some((p) => p.id === view.id)) return view;
  const first = root.projects.find((p) => !p.archived);
  return first ? { kind: 'project', id: first.id } : { kind: 'auto' };
}

/** Re-render each minute so the date, deadlines and "n days ago" stay true. */
function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);
  return now;
}

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return true;
  return target instanceof HTMLInputElement && !['checkbox', 'radio', 'button', 'submit'].includes(target.type);
}

function useShortcuts(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      const s = getState();
      if (s.confirm || s.capture || s.importState) return; // dialogs own the keyboard

      if (e.key === 'Escape') {
        const expanded = s.expandedTaskId;
        if (expanded || s.drawerOpen) set({ expandedTaskId: null, drawerOpen: false });
        if (expanded) document.querySelector<HTMLElement>(`[data-task-row="${CSS.escape(expanded)}"]`)?.focus();
        return;
      }
      if (isTyping(e.target)) return;

      if (e.key === 'n') {
        if (focusShortcut('new-task')) e.preventDefault();
      } else if (e.key === 'b') {
        e.preventDefault();
        set({ capture: true });
      } else if (e.key === 't') {
        e.preventDefault();
        setMode(s.mode === 'timeline' ? 'overview' : 'timeline');
      } else if (e.key === '/') {
        e.preventDefault();
        setMode('overview');
        set({ drawerOpen: true });
        requestAnimationFrame(() => focusShortcut('filter'));
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
}

export function App() {
  const s = useStore();
  const now = useNow();
  useShortcuts();

  const view = resolveView(s.view, s.root);
  const project = view.kind === 'project' ? s.root.projects.find((p) => p.id === view.id) : undefined;
  const hasData = s.root.projects.length > 0 || s.root.backlog.length > 0;
  const where = view.kind === 'backlog' ? 'Backlog' : (project?.name ?? 'Projects');

  return (
    <>
      <TopBar mode={s.mode} now={now} lastExportedAt={s.lastExportedAt} hasData={hasData} />
      <div class="app">
        <Banners saving={s.saving} notice={s.notice} />

        {s.mode === 'timeline' ? (
          <Timeline root={s.root} now={now} />
        ) : (
          <>
            <TodayHeading now={now} />
            <Attention root={s.root} now={now} />
            <div class="layout">
              <button
                type="button"
                class="drawer-toggle"
                aria-expanded={s.drawerOpen}
                aria-controls="sidebar"
                onClick={() => set({ drawerOpen: !s.drawerOpen })}
              >
                <span class="where">{where}</span>
                <span aria-hidden="true">{s.drawerOpen ? '▴' : '▾'}</span>
              </button>
              <Sidebar root={s.root} view={view} open={s.drawerOpen} />

              <main class="main">
                {view.kind === 'backlog' && <BacklogView root={s.root} />}
                {project && (
                  <ProjectView key={project.id} project={project} expandedTaskId={s.expandedTaskId} now={now} />
                )}
              </main>
            </div>
          </>
        )}

        <ConfirmDialog request={s.confirm} />
        <CaptureDialog open={s.capture} />
        <ImportDialog state={s.importState} current={s.root} />
        <ToastRegion toast={s.toast} />
      </div>
    </>
  );
}
