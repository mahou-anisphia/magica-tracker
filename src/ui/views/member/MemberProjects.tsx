import { isProjectDone } from '../../../core/completion';
import { plural } from '../../../core/format';
import type { Root, Task } from '../../../core/schema';
import { ReadOnlyTask } from './ReadOnlyTask';

/** Open work first, soonest deadline first; done work after. */
function order(tasks: Task[]): Task[] {
  const key = (t: Task) => (t.done ? 2 : t.due ? 0 : 1);
  return [...tasks].sort((a, b) => key(a) - key(b) || (a.due ?? '').localeCompare(b.due ?? ''));
}

/** Their active projects, each with its tasks, read-only. */
export function MemberProjects(props: { root: Root; name: string; now: Date }) {
  const projects = props.root.projects.filter((p) => !p.archived && !isProjectDone(p));
  if (!projects.length) return <p class="text-15 text-body">{props.name} has no active projects in this file.</p>;
  return (
    <div class="grid grid-cols-1 gap-28">
      {projects.map((p) => {
        const done = p.tasks.filter((t) => t.done).length;
        return (
          <section key={p.id} aria-labelledby={`member-p-${p.id}`}>
            <div class="mb-10 flex items-baseline gap-12">
              <h2 id={`member-p-${p.id}`} class="mr-auto text-17">
                {p.name}
              </h2>
              <span class="text-13 text-body tabular-nums">
                {done} of {plural(p.tasks.length, 'task')} done
              </span>
            </div>
            {p.tasks.length ? (
              <ul class="overflow-hidden rounded-14 border border-line bg-card shadow-card">
                {order(p.tasks).map((t) => (
                  <ReadOnlyTask key={t.id} task={t} now={props.now} />
                ))}
              </ul>
            ) : (
              <p class="text-14 text-body">No tasks yet.</p>
            )}
          </section>
        );
      })}
    </div>
  );
}
