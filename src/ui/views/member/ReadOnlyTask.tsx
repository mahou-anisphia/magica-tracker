import { dueLabel } from '../../../core/due';
import type { Task } from '../../../core/schema';
import { PriorityChip } from '../../components/PriorityChip';

/** A task as they see it, without anything to press. Blocked hides the other chips, as in your own tracker. */
export function ReadOnlyTask(props: { task: Task; now: Date }) {
  const { task, now } = props;
  const blocked = !task.done && !!task.blocked;
  const started = !task.done && task.subtasks.some((s) => s.done);
  return (
    <li class="flex min-h-48 items-center gap-10 border-t border-line px-18 py-8 first:border-t-0">
      <span
        class={`size-9 flex-none rounded-full ${task.done ? 'bg-faint' : started ? 'bg-primary-strong' : 'border-2 border-line-strong'}`}
        aria-hidden="true"
      />
      <span class="flex min-w-0 flex-1 flex-wrap items-center gap-x-10 gap-y-4">
        <span class={`min-w-0 flex-1 max-lg:basis-full ${task.done ? 'text-faint line-through' : 'font-medium text-ink'}`}>
          {task.title}
          {task.done && <span class="sr-only"> (done)</span>}
        </span>
        {blocked && <span class="pill pill-outline">Blocked</span>}
        {!blocked && !task.done && <PriorityChip priority={task.priority} />}
        {!blocked && !task.done && task.escalation && <span class="pill pill-high">May be escalated</span>}
        {task.due && !task.done && <span class="text-13 font-medium text-body tabular-nums">{dueLabel(task.due, now)}</span>}
      </span>
    </li>
  );
}
