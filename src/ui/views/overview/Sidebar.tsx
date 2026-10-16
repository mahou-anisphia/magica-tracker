import { useState } from 'preact/hooks';
import { isProjectDone } from '../../../core/completion';
import { byDomain } from '../../../core/domains';
import type { Project, Root } from '../../../core/schema';
import { addDomain, createProject, focusShortcut, groupProjects, moveProject, openBacklog, openProject } from '../../actions';
import { DropHere } from '../../components/DropHere';
import type { View } from '../../store';
import { AddInput } from './AddInput';
import { AddMenu } from './AddMenu';
import { DomainHeading } from './DomainHeading';
import { NAV_LIST, navItemClass } from './navItem';
import { ProjectDragLayer } from './ProjectDragLayer';
import { ProjectList, type ListDrag } from './ProjectList';
import { useProjectDrag } from './useProjectDrag';

const SUMMARY =
  "cursor-pointer list-none px-12 py-4 text-13 text-body before:content-['▸_'] group-open:before:content-['▾_'] [&::-webkit-details-marker]:hidden";

/**
 * The project list, the backlog, and completed and archived projects. Active
 * projects can be dragged into a new order, between domains, or onto an
 * uncategorized project to group the two into a new domain, which then asks
 * for its name. "+" by the heading makes a project or an empty domain to drag
 * projects into; "+ project" at the end makes a project.
 */
export function Sidebar(props: { root: Root; view: View; open: boolean }) {
  const { root, view } = props;
  const [filter, setFilter] = useState('');
  const [adding, setAdding] = useState(false);
  /** The domain whose name is being typed: just made, or being renamed. */
  const [naming, setNaming] = useState<string | null>(null);
  const { drag, press, suppressClick } = useProjectDrag({
    onDrop: (id, target) => {
      if (target.kind === 'merge') setNaming(groupProjects(target.projectId, id));
      else moveProject(id, target.domainId, target.beforeId);
    },
  });

  const q = filter.trim().toLowerCase();
  const matches = (p: Project) => !q || p.name.toLowerCase().includes(q);
  const active = root.projects.filter((p) => !p.archived && !isProjectDone(p));
  const completed = root.projects.filter((p) => !p.archived && isProjectDone(p));
  const archived = root.projects.filter((p) => p.archived);
  const shown = active.filter(matches);
  const shownCompleted = completed.filter(matches);
  const shownArchived = archived.filter(matches);
  const hasDomains = (root.domains?.length ?? 0) > 0;
  // With domains, active projects sit under their domain's name (an empty one
  // too, unless filtering), the uncategorized last. While dragging, every group
  // shows, so a project can go anywhere.
  const groups = byDomain(root, shown, (p) => p, !q);
  if (hasDomains && drag && !groups.some((g) => !g.domain)) groups.push({ domain: null, items: [] });
  const sameTarget = (domainId: string | undefined) =>
    drag?.target?.kind === 'insert' && drag.target.domainId === domainId && drag.target.beforeId === null && !drag.line;

  /** Alt+↑ / Alt+↓ on a project: one place up or down, into the next domain at a group's edge. */
  const keyMove = (id: string, dir: -1 | 1) => {
    const seq = byDomain(root, active, (p) => p, true);
    if (hasDomains && !seq.some((g) => !g.domain)) seq.push({ domain: null, items: [] });
    const gi = seq.findIndex((g) => g.items.some((p) => p.id === id));
    const g = seq[gi];
    if (!g) return;
    const i = g.items.findIndex((p) => p.id === id);
    const domainOf = (k: number) => seq[k]?.domain?.id;
    if (dir < 0) {
      if (i > 0) moveProject(id, domainOf(gi), g.items[i - 1]!.id);
      else if (gi > 0) moveProject(id, domainOf(gi - 1), null);
    } else if (i < g.items.length - 1) moveProject(id, domainOf(gi), g.items[i + 2]?.id ?? null);
    else if (gi < seq.length - 1) moveProject(id, domainOf(gi + 1), seq[gi + 1]!.items[0]?.id ?? null);
    requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-project-button="${CSS.escape(id)}"]`)?.focus());
  };

  /** Opens the new-project field at the end of the list. */
  const startProject = () => {
    setAdding(true);
    requestAnimationFrame(() => focusShortcut('new-project'));
  };

  const mergeWith = drag?.target?.kind === 'merge' ? drag.target.projectId : null;
  // Not while filtering, when the list is partial.
  const listDrag: ListDrag | undefined = q
    ? undefined
    : {
        held: drag?.id ?? null,
        mergeWith,
        press,
        suppressClick,
        onKeyMove: keyMove,
      };

  return (
    <nav
      id="sidebar"
      class={`sticky top-20 grid grid-cols-1 gap-10 max-lg:static max-lg:-mt-8 max-lg:rounded-14 max-lg:border max-lg:border-line max-lg:bg-card max-lg:p-12 ${props.open ? '' : 'max-lg:hidden'}`}
      aria-label="Projects and backlog"
    >
      <div class="flex items-center justify-between gap-8">
        <h2 class="text-13 font-medium text-body">Projects</h2>
        <AddMenu onProject={startProject} onDomain={() => setNaming(addDomain())} />
      </div>
      {root.projects.length > 0 && (
        <input
          type="search"
          class="min-h-(--tap) w-full rounded-10 border border-line bg-card px-12 py-4 text-14 placeholder:text-faint max-lg:text-16"
          placeholder="Filter projects   /"
          aria-label="Filter projects"
          data-shortcut="filter"
          value={filter}
          onInput={(e) => setFilter(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.stopPropagation();
              setFilter('');
              e.currentTarget.blur();
            } else if (e.key === 'Enter' && shown[0]) {
              openProject(shown[0].id);
            }
          }}
        />
      )}
      {hasDomains ? (
        groups.map((g) => {
          const domainId = g.domain?.id;
          const key = domainId ?? 'none';
          return (
            <section key={key} class="grid grid-cols-1 gap-4" aria-label={g.domain?.name ?? 'Uncategorized'}>
              <DomainHeading domain={g.domain} naming={!!domainId && naming === domainId} onNaming={(on) => setNaming(on ? (domainId ?? null) : null)} />
              <ProjectList projects={g.items} view={view} domainId={domainId} drag={listDrag} />
              {listDrag && (drag || !g.items.length) && (
                <div data-group-end="" data-domain={domainId ?? ''}>
                  <DropHere active={sameTarget(domainId)} label={drag ? 'Drop here' : 'Drag projects here'} class="min-h-32" />
                </div>
              )}
            </section>
          );
        })
      ) : (
        <ProjectList projects={shown} view={view} drag={listDrag} />
      )}

      {adding ? (
        <AddInput
          placeholder="Project name"
          label="New project name"
          shortcut="new-project"
          onAdd={(name) => {
            createProject(name);
            setAdding(false);
          }}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <button type="button" class="btn btn-quiet btn-small justify-self-start" onClick={startProject}>
          + project
        </button>
      )}
      {drag && (
        <ProjectDragLayer
          drag={drag}
          mergeName={mergeWith ? root.projects.find((p) => p.id === mergeWith)?.name : undefined}
        />
      )}

      <hr class="my-6 w-full border-t border-line" />

      <ul class={NAV_LIST}>
        <li>
          <button
            type="button"
            class={navItemClass(view.kind === 'backlog')}
            aria-current={view.kind === 'backlog' ? 'page' : undefined}
            onClick={openBacklog}
          >
            <span class="min-w-0 flex-1 truncate">Backlog</span>
            <span class="text-13 text-body tabular-nums">{root.backlog.length}</span>
          </button>
        </li>
      </ul>

      {shownCompleted.length > 0 && (
        <details class="group" open={!!q}>
          <summary class={SUMMARY}>
            Completed ({shownCompleted.length})
          </summary>
          <ProjectList projects={shownCompleted} view={view} muted />
        </details>
      )}

      {shownArchived.length > 0 && (
        <details class="group" open={!!q}>
          <summary class={SUMMARY}>
            Archived ({shownArchived.length})
          </summary>
          <ProjectList projects={shownArchived} view={view} muted />
        </details>
      )}
    </nav>
  );
}
