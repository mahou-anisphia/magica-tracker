import { useState } from 'preact/hooks';
import type { DueItem } from '../../../core/calendar';
import { daysUntil, dueDistance } from '../../../core/due';
import * as ops from '../../../core/ops';
import { openProject, setProjectDone, toggleTask } from '../../actions';
import { ChevronIcon } from '../../components/icons';
import { PriorityChip } from '../../components/PriorityChip';
import { set, update } from '../../store';
import { itemKey, where } from './dueItem';

/** A deadline in the day panel: a row that opens to details and quick actions. */
export function DayItem({ item, now, startOpen }: { item: DueItem; now: Date; startOpen: boolean }) {
  const [open, setOpen] = useState(startOpen);
  const { project, task, subtask } = item;
  const due = subtask?.due ?? task?.due ?? project.due;
  const status = item.done ? 'Done' : due && item.watch ? dueDistance(daysUntil(due, now)) : null;
  const detailId = `day-item-${itemKey(item)}`;

  return (
    <li class="border-b border-line">
      <button
        type="button"
        class="flex min-h-68 w-full cursor-pointer items-center gap-12 bg-transparent py-12 pr-18 pl-24 text-left hover:bg-mist-70"
        aria-expanded={open}
        aria-controls={detailId}
        onClick={() => setOpen(!open)}
      >
        <span class="grid min-w-0 flex-1 grid-cols-1 gap-1">
          <span class={`truncate font-medium ${item.done ? 'text-steel' : 'text-deep'}`} title={item.title}>
            {item.title}
          </span>
          <span class="truncate text-13 text-slate" title={where(item)}>
            {where(item)}
          </span>
        </span>
        {status ? (
          <span class={`pill ${item.done ? 'pill-plain' : 'pill-watch'}`}>{status}</span>
        ) : (
          <PriorityChip priority={task?.priority} />
        )}
        <span class={`inline-flex text-slate transition-transform ${open ? 'rotate-180' : ''}`}>
          <ChevronIcon dir="down" />
        </span>
      </button>
      {open && (
        <div id={detailId} class="grid grid-cols-1 gap-12 px-24 pb-18">
          {task && !subtask && (
            <>
              <div class="flex flex-wrap gap-6">
                <PriorityChip priority={task.priority} />
                {task.effort !== undefined && <span class="pill pill-plain">{task.effort}% allocation</span>}
                {task.subtasks.length > 0 && (
                  <span class="pill pill-plain">
                    {task.subtasks.filter((s) => s.done).length} / {task.subtasks.length} sub-tasks
                  </span>
                )}
              </div>
              {task.notes && (
                <p class="rounded-10 bg-mist px-14 py-10 text-14 whitespace-pre-wrap text-deep">{task.notes}</p>
              )}
            </>
          )}
          <div class="flex flex-wrap gap-6">
            {task && !subtask && (
              <button type="button" class="btn btn-small" onClick={() => void toggleTask(project.id, task, !task.done)}>
                {task.done ? 'Reopen' : 'Mark done'}
              </button>
            )}
            {task && subtask && (
              <button
                type="button"
                class="btn btn-small"
                onClick={() => update((r, n) => ops.setSubtaskDone(r, project.id, task.id, subtask.id, !subtask.done, n))}
              >
                {subtask.done ? 'Reopen' : 'Mark done'}
              </button>
            )}
            {!task && (
              <button type="button" class="btn btn-small" onClick={() => void setProjectDone(project, !item.done)}>
                {item.done ? 'Reopen project' : 'Mark project done'}
              </button>
            )}
            <button
              type="button"
              class="btn btn-quiet btn-small"
              onClick={() => {
                set({ day: null });
                openProject(project.id, task?.id ?? null);
              }}
            >
              Open in project →
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
