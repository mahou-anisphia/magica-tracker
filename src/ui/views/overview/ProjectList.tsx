import type { RefObject } from 'preact';
import { hasOpenTasks } from '../../../core/attention';
import { isProjectDone } from '../../../core/completion';
import { daysUntil } from '../../../core/due';
import type { Project } from '../../../core/schema';
import { openProject } from '../../actions';
import type { View } from '../../store';
import { NAV_LIST, navItemClass } from './navItem';

/** What a draggable list needs from the sidebar's drag. */
export type ListDrag = {
  /** The project being held, and the one it would group with if let go. */
  held: string | null;
  mergeWith: string | null;
  press: (e: PointerEvent, id: string, name: string) => void;
  suppressClick: RefObject<boolean>;
  /** Alt+↑ / Alt+↓: one place up or down, across domains at their edges. */
  onKeyMove: (id: string, dir: -1 | 1) => void;
};

/**
 * Some projects in the sidebar: a dot for whether anything is open, the name,
 * and a count of overdue tasks. With `drag`, they can be dragged: within and
 * between domains, or onto an uncategorized project to group the two.
 * `domainId` is the group they show in (none: Uncategorized).
 */
export function ProjectList(props: { projects: Project[]; view: View; muted?: boolean; domainId?: string; drag?: ListDrag }) {
  const { view, drag } = props;
  const today = new Date();

  return (
    <ul class={NAV_LIST}>
      {props.projects.map((p) => {
        const current = view.kind === 'project' && view.id === p.id;
        const open = hasOpenTasks(p);
        const overdue = isProjectDone(p) ? 0 : p.tasks.filter((t) => !t.done && t.due && daysUntil(t.due, today) < 0).length;
        const merging = drag?.mergeWith === p.id;
        return (
          <li
            key={p.id}
            {...(drag ? { 'data-project': p.id, 'data-domain': props.domainId ?? '' } : {})}
            class={`select-none [-webkit-touch-callout:none] ${drag?.held === p.id ? 'opacity-40' : ''}`}
            onPointerDown={drag ? (e) => drag.press(e, p.id, p.name) : undefined}
            onContextMenu={drag ? (e) => e.preventDefault() : undefined}
          >
            <button
              type="button"
              data-project-button={p.id}
              class={`${navItemClass(current, props.muted)} ${merging ? 'outline-2 outline-offset-1 outline-accent' : ''}`}
              aria-current={current ? 'page' : undefined}
              title={drag ? 'Drag to move, or onto another project to group them (Alt+↑/↓ moves it too)' : undefined}
              onClick={() => {
                if (!drag?.suppressClick.current) openProject(p.id);
              }}
              onKeyDown={
                drag
                  ? (e) => {
                      if (!e.altKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
                      e.preventDefault();
                      drag.onKeyMove(p.id, e.key === 'ArrowUp' ? -1 : 1);
                    }
                  : undefined
              }
            >
              <span
                class={`size-8 flex-none rounded-full border-[1.5px] ${open ? 'border-ink bg-ink' : 'border-line-strong'}`}
                title={open ? 'Has open tasks' : 'Nothing open'}
              />
              <span class="min-w-0 flex-1 truncate" title={p.name}>
                {p.name}
              </span>
              <span class="sr-only">{open ? '(has open tasks)' : '(nothing open)'}</span>
              {merging ? (
                <span class="pill pill-high">Group</span>
              ) : (
                overdue > 0 && (
                  <span
                    class="min-w-22 rounded-full bg-watch-tint px-7 text-center text-12 font-semibold text-watch-ink tabular-nums"
                    title={`${overdue} overdue`}
                  >
                    {overdue}
                    <span class="sr-only"> overdue</span>
                  </span>
                )
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
