import { useState } from 'preact/hooks';
import { isProjectDone } from '../../../core/completion';
import * as ops from '../../../core/ops';
import { orderTasks } from '../../../core/progress';
import type { Project } from '../../../core/schema';
import { addTask, deleteProject, setArchived, setProjectDone } from '../../actions';
import { ArchiveIcon, CheckIcon, TrashIcon } from '../../components/icons';
import { update } from '../../store';
import { AddInput } from './AddInput';
import { DueDate } from './DueDate';
import { EditableText } from './EditableText';
import { PaneSection } from './PaneSection';
import { Resources } from './Resources';
import { TaskRow } from './TaskRow';

/** A card of task rows divided by hairlines. */
const TASK_LIST =
  'grid grid-cols-1 overflow-hidden rounded-14 border border-line bg-card shadow-card [&>li+li]:border-t [&>li+li]:border-line';

export function ProjectView(props: { project: Project; expandedTaskId: string | null; now: Date }) {
  const { project: p, expandedTaskId, now } = props;
  // Most urgent first: priority, then the nearest deadline.
  const { open, done } = orderTasks(p.tasks);
  const projectDone = isProjectDone(p);
  const expandedIsDone = done.some((t) => t.id === expandedTaskId);
  const [showDone, setShowDone] = useState(false);
  const doneVisible = showDone || expandedIsDone;

  return (
    <article aria-labelledby="pane-title">
      <header class="mb-24 flex flex-wrap items-start justify-between gap-x-20 gap-y-10">
        <div class="grid min-w-0 flex-[1_1_300px] grid-cols-1 gap-6">
          <h2 id="pane-title">
            <EditableText
              class={`text-24 leading-[1.25] font-semibold tracking-[-0.015em] ${projectDone ? 'text-body' : 'text-ink'}`}
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
        <div class="flex flex-wrap items-center gap-8">
          <button
            type="button"
            class="btn btn-small aria-pressed:border-primary-pressed aria-pressed:bg-primary-tint aria-pressed:text-primary-ink"
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
          <button type="button" class="btn btn-small" onClick={() => setArchived(p, !p.archived)}>
            <ArchiveIcon />
            {p.archived ? 'Unarchive' : 'Archive'}
          </button>
          {/* Delete sits apart from the everyday actions. */}
          <button
            type="button"
            class="btn btn-quiet btn-small btn-danger ml-4 px-8"
            aria-label={`Delete project ${p.name}`}
            title="Delete project"
            onClick={() => void deleteProject(p)}
          >
            <TrashIcon />
          </button>
        </div>
      </header>

      <PaneSection id="tasks-h" title="Tasks">
        {open.length > 0 && (
          <ul class={TASK_LIST}>
            {open.map((t) => (
              <TaskRow key={t.id} project={p} task={t} expanded={expandedTaskId === t.id} now={now} />
            ))}
          </ul>
        )}
        <AddInput
          class={open.length > 0 ? 'mt-12' : ''}
          placeholder="Add a task…"
          label={`Add a task to ${p.name}`}
          shortcut="new-task"
          onAdd={(title) => addTask(p.id, title)}
        />

        {done.length > 0 && (
          <div class="mt-16">
            <button
              type="button"
              class="inline-flex min-h-(--tap) cursor-pointer items-center gap-6 bg-transparent px-4 text-14 font-medium text-body before:text-[0.8rem] before:transition-transform before:content-['▸'] aria-expanded:before:rotate-90"
              aria-expanded={doneVisible}
              aria-controls="done-list"
              onClick={() => setShowDone(!doneVisible)}
            >
              Done ({done.length})
            </button>
            {doneVisible && (
              <ul id="done-list" class={`mt-8 ${TASK_LIST}`}>
                {done.map((t) => (
                  <TaskRow key={t.id} project={p} task={t} expanded={expandedTaskId === t.id} now={now} />
                ))}
              </ul>
            )}
          </div>
        )}
      </PaneSection>

      <PaneSection id="resources-h" title="Resources" class="mt-32">
        <Resources target={{ projectId: p.id }} resources={p.resources} />
      </PaneSection>
    </article>
  );
}
