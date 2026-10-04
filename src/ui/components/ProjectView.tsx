import { useState } from 'preact/hooks';
import { isProjectDone } from '../../core/completion';
import * as ops from '../../core/ops';
import { orderTasks } from '../../core/progress';
import { DueDate } from './DueDate';
import type { Project } from '../../core/schema';
import { addTask, deleteProject, setArchived, setProjectDone } from '../actions';
import { update } from '../store';
import { ArchiveIcon, CheckIcon, TrashIcon } from './icons';
import { AddInput, EditableText } from './inputs';
import { Resources } from './Resources';
import { TaskRow } from './TaskRow';

export function ProjectView(props: { project: Project; expandedTaskId: string | null; now: Date }) {
  const { project: p, expandedTaskId, now } = props;
  // Most urgent first: priority, then the nearest deadline.
  const { open, done } = orderTasks(p.tasks);
  const projectDone = isProjectDone(p);
  const expandedIsDone = done.some((t) => t.id === expandedTaskId);
  const [showDone, setShowDone] = useState(false);
  const doneVisible = showDone || expandedIsDone;

  return (
    <article aria-labelledby="pane-title" class={projectDone ? 'project is-done' : 'project'}>
      <header class="pane-head">
        <div class="titles">
          <h2 id="pane-title">
            <EditableText
              class="pane-title"
              value={p.name}
              label="Project name"
              required
              onSave={(name) => update((r, n) => ops.renameProject(r, p.id, name, n))}
            />
          </h2>
          <EditableText
            value={p.description ?? ''}
            label="Description"
            placeholder="Add a short description"
            multiline
            onSave={(d) => update((r, n) => ops.setProjectDescription(r, p.id, d, n))}
          />
        </div>
        <div class="pane-actions">
          <button
            type="button"
            class="btn small"
            aria-pressed={projectDone}
            onClick={() => void setProjectDone(p, !projectDone)}
          >
            <CheckIcon />
            {projectDone ? 'Done · Reopen' : 'Mark done'}
          </button>
          <DueDate
            value={p.due}
            done={projectDone}
            now={now}
            of={p.name}
            emptyLabel="Deadline"
            onChange={(due) => update((r, n) => ops.setProjectDue(r, p.id, due, n))}
          />
          <button type="button" class="btn small" onClick={() => setArchived(p, !p.archived)}>
            <ArchiveIcon />
            {p.archived ? 'Unarchive' : 'Archive'}
          </button>
          <button
            type="button"
            class="btn quiet small danger"
            aria-label={`Delete project ${p.name}`}
            title="Delete project"
            onClick={() => void deleteProject(p)}
          >
            <TrashIcon />
          </button>
        </div>
      </header>

      <section class="section" aria-labelledby="tasks-h">
        <div class="section-head">
          <h3 id="tasks-h" class="eyebrow">
            Tasks
          </h3>
        </div>

        {open.length > 0 && (
          <ul class="task-list">
            {open.map((t) => (
              <TaskRow key={t.id} project={p} task={t} expanded={expandedTaskId === t.id} now={now} />
            ))}
          </ul>
        )}
        <AddInput
          placeholder="Add a task…"
          label={`Add a task to ${p.name}`}
          shortcut="new-task"
          onAdd={(title) => addTask(p.id, title)}
        />

        {done.length > 0 && (
          <div class="done-group">
            <button
              type="button"
              class="done-toggle"
              aria-expanded={doneVisible}
              aria-controls="done-list"
              onClick={() => setShowDone(!doneVisible)}
            >
              Done ({done.length})
            </button>
            {doneVisible && (
              <ul id="done-list" class="task-list">
                {done.map((t) => (
                  <TaskRow key={t.id} project={p} task={t} expanded={expandedTaskId === t.id} now={now} />
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      <section class="section" aria-labelledby="resources-h">
        <div class="section-head">
          <h3 id="resources-h" class="eyebrow">
            Resources
          </h3>
        </div>
        <Resources target={{ projectId: p.id }} resources={p.resources} />
      </section>
    </article>
  );
}
