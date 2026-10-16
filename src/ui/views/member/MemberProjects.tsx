import { isProjectDone } from '../../../core/completion';
import { byDomain } from '../../../core/domains';
import type { Root } from '../../../core/schema';
import { MemberProjectBlock } from './MemberProjectBlock';

/** Their active projects, each with its tasks, read-only; under their domains when they have any. */
export function MemberProjects(props: { root: Root; name: string; now: Date }) {
  const projects = props.root.projects.filter((p) => !p.archived && !isProjectDone(p));
  if (!projects.length) return <p class="text-15 text-body">{props.name} has no active projects in this file.</p>;
  const groups = byDomain(props.root, projects, (p) => p);
  if (groups.length === 1 && groups[0]!.domain === null) {
    return (
      <div class="grid grid-cols-1 gap-28">
        {projects.map((p) => (
          <MemberProjectBlock key={p.id} project={p} now={props.now} level={2} />
        ))}
      </div>
    );
  }
  return (
    <div class="grid grid-cols-1 gap-40">
      {groups.map((g) => (
        <section key={g.domain?.id ?? 'none'} class="grid grid-cols-1 gap-20" aria-labelledby={`member-d-${g.domain?.id ?? 'none'}`}>
          <h2 id={`member-d-${g.domain?.id ?? 'none'}`} class="text-13 font-medium text-body">
            {g.domain?.name ?? 'No domain'}
          </h2>
          {g.items.map((p) => (
            <MemberProjectBlock key={p.id} project={p} now={props.now} level={3} />
          ))}
        </section>
      ))}
    </div>
  );
}
