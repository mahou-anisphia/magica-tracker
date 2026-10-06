import { useEffect, useState } from 'preact/hooks';
import { hasSample } from '../core/sample';
import { focusShortcut } from './actions';
import { Banners } from './shell/Banners';
import { CaptureDialog } from './shell/CaptureDialog';
import { ConfirmDialog } from './shell/ConfirmDialog';
import { ImportDialog } from './shell/ImportDialog';
import { ToastRegion } from './shell/ToastRegion';
import { TopBar } from './shell/TopBar';
import { getState, set, setMode, useStore } from './store';
import { OverviewView } from './views/overview/OverviewView';
import { TimelineView } from './views/timeline/TimelineView';

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
      if (s.confirm || s.capture || s.importState || s.day) return; // dialogs own the keyboard

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

/** The shell around both views: top bar, banners, dialogs and the toast. */
export function App() {
  const s = useStore();
  const now = useNow();
  useShortcuts();

  const hasData = s.root.projects.length > 0 || s.root.backlog.length > 0;

  return (
    <>
      <TopBar mode={s.mode} now={now} lastExportedAt={s.lastExportedAt} hasData={hasData} hasSample={hasSample(s.root)} />
      <div class="mx-auto max-w-1160 pt-36 pr-[max(var(--gutter),env(safe-area-inset-right,0px))] pb-96 pl-[max(var(--gutter),env(safe-area-inset-left,0px))]">
        <Banners saving={s.saving} notice={s.notice} />

        {s.mode === 'timeline' ? (
          <TimelineView root={s.root} now={now} day={s.day} />
        ) : (
          <OverviewView
            root={s.root}
            view={s.view}
            now={now}
            expandedTaskId={s.expandedTaskId}
            drawerOpen={s.drawerOpen}
          />
        )}

        <ConfirmDialog request={s.confirm} />
        <CaptureDialog open={s.capture} />
        <ImportDialog state={s.importState} current={s.root} />
        <ToastRegion toast={s.toast} />
      </div>
    </>
  );
}
