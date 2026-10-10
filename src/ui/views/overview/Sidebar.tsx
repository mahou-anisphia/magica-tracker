import { useState } from 'preact/hooks';
import { hasOpenTasks } from '../../../core/attention';
import { isProjectDone } from '../../../core/completion';
import { daysUntil } from '../../../core/due';
import type { Project, Root } from '../../../core/schema';
import { createProject, focusShortcut, openBacklog, openProject } from '../../actions';
import type { View } from '../../store';
import { AddInput } from './AddInput';

const NAV_LIST = 'grid grid-cols-1 gap-2';
const NAV_ITEM =
  'flex min-h-(--tap) w-full cursor-pointer items-center gap-10 rounded-10 border px-12 py-4 text-left max-lg:min-h-44';
const CURRENT = 'border-line bg-card font-medium shadow-card';

/** A row in the list. Completed and archived ones stay muted, even when open. */
function navItemClass(current: boolean, muted = false): string {
  const color = muted ? 'text-faint' : current ? 'text-ink' : 'text-body hover:text-primary-ink';
  return `${NAV_ITEM} ${current ? CURRENT : 'border-transparent bg-transparent'} ${color}`;
}

const SUMMARY =
  "cursor-pointer list-none px-12 py-4 text-13 text-body before:content-['▸_'] group-open:before:content-['▾_'] [&::-webkit-details-marker]:hidden";

export function Sidebar(props: { root: Root; view: View; open: boolean }) {
  const { root, view } = props;
  const [filter, setFilter] = useState('');
  const [adding, setAdding] = useState(false);

  const q = filter.trim().toLowerCase();
  const matches = (p: Project) => !q || p.name.toLowerCase().includes(q);
  const active = root.projects.filter((p) => !p.archived && !isProjectDone(p));
  const completed = root.projects.filter((p) => !p.archived && isProjectDone(p));
  const archived = root.projects.filter((p) => p.archived);
  const shown = active.filter(matches);
  const shownCompleted = completed.filter(matches);
  const shownArchived = archived.filter(matches);
  const today = new Date();

  const item = (p: Project, muted = false) => {
    const current = view.kind === 'project' && view.id === p.id;
    const open = hasOpenTasks(p);
    const overdue = isProjectDone(p)
      ? 0
      : p.tasks.filter((t) => !t.done && t.due && daysUntil(t.due, today) < 0).length;
    return (
      <li key={p.id}>
        <button
          type="button"
          class={navItemClass(current, muted)}
          aria-current={current ? 'page' : undefined}
          onClick={() => openProject(p.id)}
        >
          <span
            class={`size-8 flex-none rounded-full border-[1.5px] ${open ? 'border-ink bg-ink' : 'border-line-strong'}`}
            title={open ? 'Has open tasks' : 'Nothing open'}
          />
          <span class="min-w-0 flex-1 truncate" title={p.name}>
            {p.name}
          </span>
          <span class="sr-only">{open ? '(has open tasks)' : '(nothing open)'}</span>
          {overdue > 0 && (
            <span
              class="min-w-22 rounded-full bg-watch-tint px-7 text-center text-12 font-semibold text-watch-ink tabular-nums"
              title={`${overdue} overdue`}
            >
              {overdue}
              <span class="sr-only"> overdue</span>
            </span>
          )}
        </button>
      </li>
    );
  };

  return (
    <nav
      id="sidebar"
      class={`sticky top-20 grid grid-cols-1 gap-10 max-lg:static max-lg:-mt-8 max-lg:rounded-14 max-lg:border max-lg:border-line max-lg:bg-card max-lg:p-12 ${props.open ? '' : 'max-lg:hidden'}`}
      aria-label="Projects and backlog"
    >
      <h2 class="text-13 font-medium text-body">Projects</h2>
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
      <ul class={NAV_LIST}>{shown.map((p) => item(p))}</ul>

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
        <button
          type="button"
          class="btn btn-quiet btn-small justify-self-start"
          onClick={() => {
            setAdding(true);
            requestAnimationFrame(() => focusShortcut('new-project'));
          }}
        >
          + project
        </button>
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
          <ul class={NAV_LIST}>{shownCompleted.map((p) => item(p, true))}</ul>
        </details>
      )}

      {shownArchived.length > 0 && (
        <details class="group" open={!!q}>
          <summary class={SUMMARY}>
            Archived ({shownArchived.length})
          </summary>
          <ul class={NAV_LIST}>{shownArchived.map((p) => item(p, true))}</ul>
        </details>
      )}
    </nav>
  );
}
