import type { DueItem } from '../../../core/calendar';
import { daysUntil, dueDistance } from '../../../core/due';
import type { AllocationPeriod } from '../../../core/schema';
import { where } from '../../components/dueItem';
import { PriorityChip } from '../../components/PriorityChip';
import { StatusChip } from '../../components/StatusChip';
import { useLoadFormat } from '../../components/useUnit';

/** One of their deadlines on a day, with its details shown and nothing to press. */
/** `period`: theirs, which their allocations are shares of. */
export function MemberDayItem(props: { item: DueItem; now: Date; period: AllocationPeriod }) {
  const { item, now } = props;
  const fmtLoad = useLoadFormat(props.period);
  const { task, subtask } = item;
  const due = subtask?.due ?? task?.due ?? item.project.due;
  const status = item.done ? 'Done' : due && item.watch ? dueDistance(daysUntil(due, now)) : null;
  const details = task && !subtask;
  return (
    <li class="grid grid-cols-1 gap-8 border-b border-line py-14 pr-18 pl-24">
      <div class="flex items-center gap-12">
        <span class="grid min-w-0 flex-1 grid-cols-1 gap-1">
          <span class={`truncate font-medium ${item.done ? 'text-faint' : 'text-ink'}`} title={item.title}>
            {item.title}
          </span>
          <span class="truncate text-13 text-body" title={where(item)}>
            {where(item)}
          </span>
        </span>
        {status ? <span class={`pill ${item.done ? 'pill-plain' : 'pill-watch'}`}>{status}</span> : <PriorityChip priority={task?.priority} />}
      </div>
      {details && (task.status === 'waiting' || task.status === 'working' || task.escalation || task.effort !== undefined || task.subtasks.length > 0) && (
        <div class="flex flex-wrap gap-6">
          {!task.done && <StatusChip status={task.status} />}
          {!task.done && task.waiting?.on && <span class="text-13 text-body">On {task.waiting.on}</span>}
          {!task.done && task.escalation && <span class="pill pill-high">May be escalated</span>}
          {task.effort !== undefined && <span class="pill pill-plain">{fmtLoad(task.effort)} allocation</span>}
          {task.subtasks.length > 0 && (
            <span class="pill pill-plain">
              {task.subtasks.filter((s) => s.done).length} / {task.subtasks.length} sub-tasks
            </span>
          )}
        </div>
      )}
    </li>
  );
}
