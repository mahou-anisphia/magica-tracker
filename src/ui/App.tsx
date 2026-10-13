import { useEffect, useState } from 'preact/hooks';
import { hasSample, hasSampleTeam } from '../core/sample';
import { focusShortcut } from './actions';
import { Banners } from './shell/Banners';
import { CaptureDialog } from './shell/CaptureDialog';
import { CommandPalette } from './shell/CommandPalette';
import { ConfirmDialog } from './shell/ConfirmDialog';
import { ImportDialog } from './shell/ImportDialog';
import { Orb } from './shell/Orb';
import { ToastRegion } from './shell/ToastRegion';
import { TopBar } from './shell/TopBar';
import { getState, set, setMode, useStore } from './store';
import { OverviewView } from './views/overview/OverviewView';
import { BoardView } from './views/board/BoardView';
import { MemberView } from './views/member/MemberView';
import { ObservatoryView } from './views/observatory/ObservatoryView';
import { SettingsView } from './views/settings/SettingsView';
import { TeamView } from './views/team/TeamView';
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
      if (e.defaultPrevented) return;
      const s = getState();
      // ⌘K on Mac, Ctrl+K elsewhere: the search palette, even while typing.
      if ((e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        set({ palette: !s.palette });
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (s.palette) return;
      if (s.confirm || s.capture || s.importState || s.teamImport || s.day) return; // dialogs own the keyboard

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
      } else if (e.key === 't' && (s.mode === 'overview' || s.mode === 'timeline')) {
        e.preventDefault();
        setMode(s.mode === 'timeline' ? 'overview' : 'timeline');
      } else if (e.key === '/' && (s.mode === 'overview' || s.mode === 'timeline')) {
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

  // Loading from IndexedDB takes a moment; show the bare page rather than an
  // empty tracker that would flash "Load sample data".
  if (!s.ready) return null;
  const hasData = s.root.projects.length > 0 || s.root.backlog.length > 0;
  // "View as" needs a member with a file; without one, Team is where to get it.
  const member = s.mode === 'member' ? s.team.members.find((m) => m.id === s.memberId && m.snapshot) : undefined;
  const mode = s.mode === 'member' && !member ? 'team' : s.mode;
  // The top bar belongs to the everyday views. The orb's screens have their own
  // way back ("Your tracker"), so a view switch there would only jump you home.
  const everyday = mode === 'overview' || mode === 'timeline';

  return (
    <>
      {everyday && (
        <TopBar
          mode={s.mode}
          now={now}
          lastExportedAt={s.lastExportedAt}
          hasData={hasData}
          hasSample={hasSample(s.root) || hasSampleTeam(s.team)}
        />
      )}
      <div
        class={`mx-auto max-w-1160 ${everyday ? 'pt-36' : 'pt-[calc(36px+env(safe-area-inset-top,0px))]'} pr-[max(var(--gutter),env(safe-area-inset-right,0px))] pb-96 pl-[max(var(--gutter),env(safe-area-inset-left,0px))]`}
      >
        <Banners saving={s.saving} notice={s.notice} />

        {mode === 'board' ? (
          <BoardView root={s.root} now={now} />
        ) : mode === 'settings' ? (
          <SettingsView root={s.root} theme={s.theme} storage={s.storage} />
        ) : mode === 'team' ? (
          <TeamView root={s.root} team={s.team} teamImport={s.teamImport} now={now} />
        ) : mode === 'observatory' ? (
          <ObservatoryView root={s.root} team={s.team} now={now} />
        ) : member ? (
          <MemberView key={member.id} member={member} now={now} />
        ) : mode === 'timeline' ? (
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
        <CommandPalette open={s.palette} root={s.root} team={s.team} />
        <Orb />
        <ToastRegion toast={s.toast} />
      </div>
    </>
  );
}
