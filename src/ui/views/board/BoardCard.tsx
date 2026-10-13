import { daysUntil, dueLabel, isDueSoon } from '../../../core/due';
import * as ops from '../../../core/ops';
import type { Project, Task } from '../../../core/schema';
import { daysSince } from '../../../core/time';
import { moveTask, openProject } from '../../actions';
import { update } from '../../store';
import { StatusPicker } from './StatusPicker';
import { WaitingOnInput } from './WaitingOnInput';

/**
 * One task: its title, deadline, an urgent mark, and while it waits, on what
 * and for how long. Drag it to another column, or open it to move it with the
 * status buttons (keyboard and touch).
 */
export function BoardCard(props: {
  project: Project;
  task: Task;
  now: Date;
  open: boolean;
  /** Just moved to Waiting: ask what on. */
  askWaitingOn: boolean;
  onToggle: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const { project, task, now } = props;
  const watch = isDueSoon(task.due, task.done, now);
  const overdue = !!task.due && !task.done && daysUntil(task.due, now) < 0;
  const waitedDays = task.waiting ? daysSince(task.waiting.since, now) : 0;
  const detailId = `board-card-${task.id}`;

  return (
    <li
      draggable={!props.open}
      onDragStart={(e) => {
        e.dataTransfer?.setData('text/plain', task.id);
        if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
        props.onDragStart();
      }}
      onDragEnd={props.onDragEnd}
      class={`rounded-10 border bg-card shadow-card ${props.open ? 'border-accent-line' : 'border-line'} ${
        task.done ? 'opacity-80' : ''
      }`}
    >
      <button
        type="button"
        class="grid w-full cursor-pointer grid-cols-1 gap-4 rounded-10 bg-transparent px-12 py-10 text-left hover:bg-page-55 max-lg:min-h-44"
        aria-expanded={props.open}
        aria-controls={detailId}
        onClick={props.onToggle}
      >
        <span class={`text-14 font-medium ${task.done ? 'text-faint line-through' : 'text-ink'}`}>
          {task.title}
          {task.done && <span class="sr-only"> (done)</span>}
        </span>
        {(task.due || task.priority === 'urgent' || task.status === 'waiting') && (
          <span class="flex flex-wrap items-center gap-x-8 gap-y-4 text-12 text-body">
            {task.priority === 'urgent' && !task.done && <span class="pill pill-urgent py-0">Urgent</span>}
            {task.due && (
              <span class={`tabular-nums ${watch ? 'font-semibold text-watch-ink' : ''}`}>
                {overdue ? '' : 'Due '}
                {dueLabel(task.due, now, undefined, task.done ? 'ago' : 'overdue')}
              </span>
            )}
            {task.status === 'waiting' && (
              <span>
                {task.waiting?.on ? `On ${task.waiting.on}` : 'Waiting'}
                {waitedDays > 0 ? ` · ${waitedDays}d` : ''}
              </span>
            )}
          </span>
        )}
      </button>
      {props.open && (
        <div id={detailId} class="grid grid-cols-1 gap-10 border-t border-line px-12 pt-10 pb-12">
          <StatusPicker label={`Move “${task.title}”`} value={task.status} onChange={(s) => void moveTask(project.id, task, s)} />
          {task.status === 'waiting' && (
            <WaitingOnInput
              value={task.waiting?.on}
              autoFocus={props.askWaitingOn}
              onSave={(text) => update((r, n) => ops.setTaskWaitingOn(r, project.id, task.id, text, n))}
            />
          )}
          <button type="button" class="btn btn-quiet btn-small justify-self-start" onClick={() => openProject(project.id, task.id)}>
            Open in project →
          </button>
        </div>
      )}
    </li>
  );
}
