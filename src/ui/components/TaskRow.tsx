import { useState } from 'preact/hooks';
import { isStale } from '../../core/attention';
import { subtaskProgress } from '../../core/completion';
import { newId } from '../../core/id';
import * as ops from '../../core/ops';
import type { Project, Subtask, Task } from '../../core/schema';
import { daysSince } from '../../core/time';
import { deleteTask, demoteTask, toggleTask } from '../actions';
import { set, update, updateWithUndo } from '../store';
import { DueDate } from './DueDate';
import { CrossIcon, PencilIcon } from './icons';
import { AddInput, EditableText, InlineInput } from './inputs';
import { Resources } from './Resources';

type Props = { project: Project; task: Task; expanded: boolean; now: Date };

/**
 * Controlled checkbox: put the DOM back to the stored value right away and let
 * the store decide, since unticking a parent may be cancelled at the confirm.
 */
function onCheck(current: boolean, apply: (want: boolean) => void) {
  return (e: Event) => {
    const input = e.currentTarget as HTMLInputElement;
    const want = input.checked;
    input.checked = current;
    apply(want);
  };
}

export function TaskRow({ project, task, expanded, now }: Props) {
  const [renaming, setRenaming] = useState(false);
  const progress = subtaskProgress(task);
  const stale = isStale(task, now);
  const detailId = `task-detail-${task.id}`;
  const toggleExpand = () => set({ expandedTaskId: expanded ? null : task.id });

  return (
    <li id={`task-${task.id}`} class={`task ${task.done ? 'is-done' : ''} ${expanded ? 'is-expanded' : ''}`}>
      <div class="task-row">
        <label class="check">
          <input
            type="checkbox"
            checked={task.done}
            onChange={onCheck(task.done, (want) => void toggleTask(project.id, task, want))}
          />
          <span class="sr-only">
            {task.done ? 'Reopen' : 'Complete'} “{task.title}”
          </span>
        </label>
        {renaming ? (
          <InlineInput
            value={task.title}
            label="Task title"
            onCancel={() => setRenaming(false)}
            onSave={(title) => {
              setRenaming(false);
              update((r, n) => ops.renameTask(r, project.id, task.id, title, n));
            }}
          />
        ) : (
          <button
            type="button"
            class="task-title"
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
            <span class="text">{task.title}</span>
            {stale && (
              <span class="watch-dot" title={`Untouched ${daysSince(task.updatedAt, now)} days`}>
                <span class="sr-only">untouched {daysSince(task.updatedAt, now)} days</span>
              </span>
            )}
            {progress.total > 0 && (
              <span class="progress" aria-label={`${progress.done} of ${progress.total} sub-tasks done`}>
                {progress.done} / {progress.total}
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
        <div id={detailId} class="task-detail">
          {task.subtasks.length > 0 && (
            <ul class="subtasks" aria-label="Sub-tasks">
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

          <EditableText
            value={task.notes ?? ''}
            label="Notes"
            placeholder="Notes…"
            multiline
            onSave={(notes) => update((r, n) => ops.setTaskNotes(r, project.id, task.id, notes, n))}
          />

          <Resources target={{ projectId: project.id, taskId: task.id }} resources={task.resources} />

          <div class="task-actions">
            <button type="button" class="btn quiet small" onClick={() => setRenaming(true)}>
              Rename
            </button>
            <button type="button" class="btn quiet small" onClick={() => void demoteTask(project.id, task)}>
              Send to backlog
            </button>
            <button type="button" class="btn quiet small" onClick={() => void deleteTask(project.id, task)}>
              Delete
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

function SubtaskRow({ project, task, subtask, now }: { project: Project; task: Task; subtask: Subtask; now: Date }) {
  const [editing, setEditing] = useState(false);
  const cbId = `sub-${subtask.id}`;

  if (editing) {
    return (
      <li class="subtask">
        <InlineInput
          value={subtask.title}
          label="Sub-task title"
          onCancel={() => setEditing(false)}
          onSave={(title) => {
            setEditing(false);
            update((r, n) => ops.renameSubtask(r, project.id, task.id, subtask.id, title, n));
          }}
        />
      </li>
    );
  }

  return (
    <li class={`subtask ${subtask.done ? 'is-done' : ''}`}>
      <label class="sub-label" for={cbId}>
        <input
          id={cbId}
          type="checkbox"
          checked={subtask.done}
          onChange={onCheck(subtask.done, (want) =>
            update((r, n) => ops.setSubtaskDone(r, project.id, task.id, subtask.id, want, n)),
          )}
        />
        {subtask.title}
      </label>
      <DueDate
        value={subtask.due}
        done={subtask.done}
        now={now}
        of={subtask.title}
        onChange={(due) => update((r, n) => ops.setSubtaskDue(r, project.id, task.id, subtask.id, due, n))}
      />
      <div class="sub-actions">
        <button
          type="button"
          class="icon-btn"
          aria-label={`Edit “${subtask.title}”`}
          title="Edit"
          onClick={() => setEditing(true)}
        >
          <PencilIcon />
        </button>
        <button
          type="button"
          class="icon-btn"
          aria-label={`Delete “${subtask.title}”`}
          title="Delete"
          onClick={() =>
            updateWithUndo(`Deleted “${subtask.title}”`, (r, n) => ops.deleteSubtask(r, project.id, task.id, subtask.id, n))
          }
        >
          <CrossIcon />
        </button>
      </div>
    </li>
  );
}
