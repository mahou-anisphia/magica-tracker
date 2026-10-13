import type { BoardLane as Lane } from '../../../core/board';
import { plural } from '../../../core/format';
import type { Status, Task } from '../../../core/schema';
import { moveTask, openProject } from '../../actions';
import { BoardCard } from './BoardCard';
import { COLUMNS, GRID, type Dragging } from './columns';

/**
 * One project across the columns. A card can be dropped in another column of
 * its own lane only: moving between projects isn't what a board is for.
 */
export function BoardLane(props: {
  lane: Lane;
  now: Date;
  dragging: Dragging;
  openCard: string | null;
  askWaitingOn: string | null;
  onDrag: (d: Dragging) => void;
  onOpenCard: (taskId: string | null) => void;
  onMoved: (task: Task, status: Status) => void;
}) {
  const { lane, dragging } = props;
  const p = lane.project;
  const open = Object.values(lane.cells).reduce((n, c) => n + c.length, 0) - lane.cells.done.length;
  const canDrop = dragging?.projectId === p.id;

  return (
    <section class={`${GRID} border-t border-line first:border-t-0`} aria-label={p.name}>
      <div class="flex items-start gap-8 px-16 py-14 max-md:pb-4">
        {lane.needs !== 'later' && (
          <span
            class={`mt-7 size-7 flex-none rounded-full ${lane.needs === 'now' ? 'bg-watch-mark' : 'bg-watch'}`}
            title={lane.needs === 'now' ? 'Something overdue or urgent' : 'Something due soon'}
          />
        )}
        <span class="grid min-w-0 grid-cols-1">
          <button
            type="button"
            class="cursor-pointer bg-transparent p-0 text-left text-15 font-semibold break-words text-ink hover:text-primary-ink"
            title={`Open ${p.name}`}
            onClick={() => openProject(p.id)}
          >
            {p.name}
          </button>
          <span class="text-12 text-body">{open ? plural(open, 'open task') : 'Nothing open'}</span>
        </span>
      </div>
      {COLUMNS.map((col) => {
        const cards = lane.cells[col.status];
        return (
          <div
            key={col.status}
            class={`min-h-64 border-l border-line px-8 py-10 max-md:border-l-0 max-md:px-16 max-md:py-4 ${
              cards.length ? '' : 'max-md:hidden'
            } ${canDrop ? 'bg-page-55' : ''}`}
            onDragOver={(e) => {
              if (canDrop) e.preventDefault();
            }}
            onDrop={(e) => {
              e.preventDefault();
              const task = p.tasks.find((t) => t.id === dragging?.taskId);
              props.onDrag(null);
              if (!task || !canDrop || task.status === col.status) return;
              void moveTask(p.id, task, col.status).then(() => props.onMoved(task, col.status));
            }}
          >
            <span class="mb-6 hidden text-12 font-medium text-body max-md:block">{col.label}</span>
            {cards.length > 0 && (
              <ul class="grid grid-cols-1 gap-8">
                {cards.map((t) => (
                  <BoardCard
                    key={t.id}
                    project={p}
                    task={t}
                    now={props.now}
                    open={props.openCard === t.id}
                    askWaitingOn={props.askWaitingOn === t.id}
                    onToggle={() => props.onOpenCard(props.openCard === t.id ? null : t.id)}
                    onDragStart={() => props.onDrag({ taskId: t.id, projectId: p.id })}
                    onDragEnd={() => props.onDrag(null)}
                  />
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </section>
  );
}
