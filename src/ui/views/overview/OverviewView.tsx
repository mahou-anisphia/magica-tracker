import type { Root } from '../../../core/schema';
import { set, type View } from '../../store';
import { BacklogView } from './BacklogView';
import { NeedsAttention } from './NeedsAttention';
import { ProjectView } from './ProjectView';
import { Sidebar } from './Sidebar';
import { StatsRow } from './StatsRow';
import { TodayHeading } from './TodayHeading';

/** A missing or deleted project falls back to the first active one. */
function resolveView(view: View, root: Root): View {
  if (view.kind === 'backlog') return view;
  if (view.kind === 'project' && root.projects.some((p) => p.id === view.id)) return view;
  const first = root.projects.find((p) => !p.archived);
  return first ? { kind: 'project', id: first.id } : { kind: 'auto' };
}

/**
 * The Overview: today's date, the numbers, what needs attention, then the
 * project list beside the open project or the backlog. Below 800px the
 * project list folds into a drawer under a toggle.
 */
export function OverviewView(props: {
  root: Root;
  view: View;
  now: Date;
  expandedTaskId: string | null;
  drawerOpen: boolean;
}) {
  const { root, now, drawerOpen } = props;
  const view = resolveView(props.view, root);
  const project = view.kind === 'project' ? root.projects.find((p) => p.id === view.id) : undefined;
  const where = view.kind === 'backlog' ? 'Backlog' : (project?.name ?? 'Projects');

  return (
    <>
      <TodayHeading now={now} />
      <StatsRow root={root} now={now} />
      <NeedsAttention root={root} now={now} />
      <div class="grid grid-cols-[236px_minmax(0,1fr)] items-start gap-40 max-lg:grid-cols-1 max-lg:gap-16">
        <button
          type="button"
          class="hidden w-full cursor-pointer items-center justify-between gap-10 rounded-12 border border-line bg-card px-16 font-medium text-ink max-lg:flex max-lg:min-h-44"
          aria-expanded={drawerOpen}
          aria-controls="sidebar"
          onClick={() => set({ drawerOpen: !drawerOpen })}
        >
          <span class="min-w-0 truncate">{where}</span>
          <span aria-hidden="true">{drawerOpen ? '▴' : '▾'}</span>
        </button>
        <Sidebar root={root} view={view} open={drawerOpen} />

        <main class="min-w-0">
          {view.kind === 'backlog' && <BacklogView root={root} />}
          {project && <ProjectView key={project.id} project={project} expandedTaskId={props.expandedTaskId} now={now} />}
        </main>
      </div>
    </>
  );
}
