import { plural } from '../../../core/format';
import type { Project, Task } from '../../../core/schema';
import { ReadOnlyTask } from './ReadOnlyTask';

/** Open work first, soonest deadline first; done work after. */
function order(tasks: Task[]): Task[] {
  const key = (t: Task) => (t.done ? 2 : t.due ? 0 : 1);
  return [...tasks].sort((a, b) => key(a) - key(b) || (a.due ?? '').localeCompare(b.due ?? ''));
}

/** One project and its tasks, read-only. `level` is its heading's: 3 under a domain, else 2. */
export function MemberProjectBlock(props: { project: Project; now: Date; level: 2 | 3 }) {
  const p = props.project;
  const done = p.tasks.filter((t) => t.done).length;
  const Heading = props.level === 3 ? 'h3' : 'h2';
  return (
    <section aria-labelledby={`member-p-${p.id}`}>
      <div class="mb-10 flex items-baseline gap-12">
        <Heading id={`member-p-${p.id}`} class="mr-auto text-17">
          {p.name}
        </Heading>
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
}
