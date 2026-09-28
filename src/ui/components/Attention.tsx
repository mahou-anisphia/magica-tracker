import { Fragment } from 'preact';
import { attention, isQuiet } from '../../core/attention';
import { dueDistance } from '../../core/due';
import { plural } from '../../core/format';
import type { Root } from '../../core/schema';
import { openProject } from '../actions';

const MAX_LISTED = 5;
const MAX_NAMED = 4;

/**
 * What's moving, what's due, what's gone quiet. Computed, never stored.
 * When nothing qualifies the panel isn't shown at all.
 */
export function Attention(props: { root: Root; now: Date }) {
  const a = attention(props.root, props.now);
  if (isQuiet(a)) return null;
  const due = a.due.slice(0, MAX_LISTED);
  const stale = a.stale.slice(0, Math.max(0, MAX_LISTED - due.length));
  const hidden = a.due.length + a.stale.length - due.length - stale.length;

  return (
    <section class="attention" aria-labelledby="attention-h">
      <h2 id="attention-h" class="eyebrow">
        Needs attention
      </h2>
      <ul>
        {a.inProgress.length > 0 && (
          <li>
            <span class="summary">
              {plural(a.inProgress.length, 'task')} in progress across {plural(a.inProgressProjects, 'project')}
            </span>
            <span class="context">
              {a.inProgress.slice(0, MAX_NAMED).map(({ project, task }, i) => (
                <Fragment key={task.id}>
                  {i > 0 && ', '}
                  <button
                    type="button"
                    class="link-quiet"
                    title={task.title}
                    onClick={() => openProject(project.id, task.id)}
                  >
                    {task.title}
                  </button>
                </Fragment>
              ))}
              {a.inProgress.length > MAX_NAMED && `, and ${a.inProgress.length - MAX_NAMED} more`}
            </span>
          </li>
        )}
        {due.map(({ project, task, subtask, days }) => {
          let context = 'project deadline';
          if (subtask && task) context = `${task.title} · ${project.name}`;
          else if (task) context = project.name;
          return (
            <li key={subtask?.id ?? task?.id ?? `project-${project.id}`}>
              <button
                type="button"
                class="link-quiet"
                title={subtask?.title ?? task?.title ?? project.name}
                onClick={() => openProject(project.id, task?.id ?? null)}
              >
                {subtask?.title ?? task?.title ?? project.name}
              </button>
              <span class="watch-pill">{dueDistance(days)}</span>
              <span class="context" title={context}>
                {context}
              </span>
            </li>
          );
        })}
        {stale.map(({ project, task, days }) => (
          <li key={task.id}>
            <button type="button" class="link-quiet" title={task.title} onClick={() => openProject(project.id, task.id)}>
              {task.title}
            </button>
            <span class="watch-pill">untouched {plural(days, 'day')}</span>
            <span class="context" title={project.name}>
              {project.name}
            </span>
          </li>
        ))}
        {hidden > 0 && (
          <li>
            <span class="context">and {hidden} more</span>
          </li>
        )}
      </ul>
    </section>
  );
}
