import { useState } from 'preact/hooks';
import { isStale } from '../../../core/attention';
import { subtaskProgress } from '../../../core/completion';
import { newId } from '../../../core/id';
import * as ops from '../../../core/ops';
import { PRIORITIES, type Priority, type Project, type Task } from '../../../core/schema';
import { daysSince } from '../../../core/time';
import { deleteTask, demoteTask, toggleTask } from '../../actions';
import { PencilIcon, TrashIcon, TrayIcon } from '../../components/icons';
import { PRIORITY_LABEL, PriorityChip } from '../../components/PriorityChip';
import { set, update } from '../../store';
import { AddInput } from './AddInput';
import { controlledCheck } from './controlledCheck';
import { DueDate } from './DueDate';
import { EditableText } from './EditableText';
import { EffortInput } from './EffortInput';
import { InlineInput } from './InlineInput';
import { Resources } from './Resources';
import { SubtaskRow } from './SubtaskRow';

type Props = { project: Project; task: Task; expanded: boolean; now: Date };

export function TaskRow({ project, task, expanded, now }: Props) {
  const [renaming, setRenaming] = useState(false);
  const progress = subtaskProgress(task);
  const stale = isStale(task, now);
  const detailId = `task-detail-${task.id}`;
  const toggleExpand = () => set({ expandedTaskId: expanded ? null : task.id });

  return (
    <li id={`task-${task.id}`} class={expanded ? 'bg-mist-55' : ''}>
      {/* group/row: an empty deadline button brightens while the row is hovered. */}
      <div class="group/row flex min-h-54 items-center gap-10 pr-14 pl-18 max-lg:min-h-52 max-lg:pr-8 max-lg:pl-12">
        <label class="-ml-5 inline-flex size-28 flex-none cursor-pointer items-center justify-center max-lg:-mr-8 max-lg:-ml-13 max-lg:size-44">
          <input
            type="checkbox"
            checked={task.done}
            onChange={controlledCheck(task.done, (want) => void toggleTask(project.id, task, want))}
          />
          <span class="sr-only">
            {task.done ? 'Reopen' : 'Complete'} “{task.title}”
          </span>
        </label>
        {renaming ? (
          <InlineInput
            value={task.title}
            label="Task title"
            box="mx-0 my-8 rounded-8 border border-iris bg-card px-8 py-2"
            class="text-deep"
            onCancel={() => setRenaming(false)}
            onSave={(title) => {
              setRenaming(false);
              update((r, n) => ops.renameTask(r, project.id, task.id, title, n));
            }}
          />
        ) : (
          <button
            type="button"
            class={`group/title flex min-w-0 flex-1 cursor-pointer items-center gap-10 bg-transparent px-4 py-10 text-left max-lg:min-h-44 max-lg:flex-wrap max-lg:gap-y-4 ${task.done ? 'font-normal text-steel' : 'font-medium text-deep'}`}
            data-task-row={task.id}
            aria-expanded={expanded}
            aria-controls={detailId}
            onClick={toggleExpand}
            onKeyDown={(e) => {
              // Space toggles the focused task; Enter (and click) expands it.
              if (e.key === ' ') {
                e.preventDefault();
                void toggleTask(project.id, task, !task.done);
              }
            }}
            onKeyUp={(e) => {
              if (e.key === ' ') e.preventDefault();
            }}
          >
            {/* Narrow: the title gets the full width; its chips go on a line beneath. */}
            <span class="min-w-0 flex-1 group-hover/title:text-iris-deep max-lg:basis-full">{task.title}</span>
            <PriorityChip priority={task.priority} />
            {stale && (
              <span class="inline-block size-7 flex-none rounded-full bg-burnished" title={`Untouched ${daysSince(task.updatedAt, now)} days`}>
                <span class="sr-only">untouched {daysSince(task.updatedAt, now)} days</span>
              </span>
            )}
            {progress.total > 0 && (
              <span
                class={`text-13 tabular-nums ${task.done ? 'font-normal text-steel' : 'font-medium text-slate'}`}
                aria-label={`${progress.done} of ${progress.total} sub-tasks done`}>
                {progress.done} / {progress.total}
              </span>
            )}
            {task.effort !== undefined && (
              <span
                class="rounded-full bg-iris-tint px-8 py-1 text-12 font-medium text-iris-deep tabular-nums"
                title="Allocation: share of your capacity"
              >
                {task.effort}%
              </span>
            )}
          </button>
        )}
        <DueDate
          value={task.due}
          done={task.done}
          now={now}
          of={task.title}
          onChange={(due) => update((r, n) => ops.setTaskDue(r, project.id, task.id, due, n))}
        />
      </div>

      {expanded && (
        <div id={detailId} class="grid grid-cols-1 gap-14 pt-4 pr-22 pb-18 pl-54 max-lg:pr-14 max-lg:pb-16 max-lg:pl-14">
          {/* Notes sit at the top of a task, like a note pinned to it. */}
          <EditableText
            box="m-0 rounded-10 border border-line bg-card px-14 py-10"
            class="text-deep"
            value={task.notes ?? ''}
            label="Notes"
            placeholder="Notes…"
            multiline
            onSave={(notes) => update((r, n) => ops.setTaskNotes(r, project.id, task.id, notes, n))}
          />

          {task.subtasks.length > 0 && (
            <ul class="grid grid-cols-1 gap-0" aria-label="Sub-tasks">
              {task.subtasks.map((s) => (
                <SubtaskRow key={s.id} project={project} task={task} subtask={s} now={now} />
              ))}
            </ul>
          )}
          <AddInput
            placeholder="Add a sub-task…"
            label={`Add a sub-task to “${task.title}”`}
            onAdd={(title) => {
              const id = newId();
              update((r, n) => ops.addSubtask(r, project.id, task.id, id, title, n));
            }}
          />

          <Resources target={{ projectId: project.id, taskId: task.id }} resources={task.resources} />

          <div class="flex flex-wrap items-center gap-x-20 gap-y-8">
            <label class="inline-flex items-center gap-8 text-13 font-medium text-slate">
              Priority
              <select
                class="min-h-30 rounded-8 border border-line bg-card px-10 py-2 text-14 text-deep max-lg:min-h-44 max-lg:text-16"
                value={task.priority ?? ''}
                onChange={(e) => {
                  const v = e.currentTarget.value as Priority | '';
                  update((r, n) => ops.setTaskPriority(r, project.id, task.id, v || undefined, n));
                }}
              >
                <option value="">None</option>
                {PRIORITIES.slice().reverse().map((p) => (
                  <option key={p} value={p}>
                    {PRIORITY_LABEL[p]}
                  </option>
                ))}
              </select>
            </label>
            <EffortInput
              value={task.effort}
              onChange={(effort) => update((r, n) => ops.setTaskEffort(r, project.id, task.id, effort, n))}
            />
          </div>

          <div class="flex flex-wrap items-center gap-x-6 gap-y-4 border-t border-line pt-10">
            <button type="button" class="btn btn-quiet btn-small" onClick={() => setRenaming(true)}>
              <PencilIcon />
              Rename
            </button>
            <button type="button" class="btn btn-quiet btn-small" onClick={() => void demoteTask(project.id, task)}>
              <TrayIcon />
              Send to backlog
            </button>
            <button
              type="button"
              class="btn btn-quiet btn-small btn-danger ml-auto"
              onClick={() => void deleteTask(project.id, task)}
            >
              <TrashIcon />
              Delete task
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
