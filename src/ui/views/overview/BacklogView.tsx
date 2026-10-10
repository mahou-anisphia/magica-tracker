import type { Root } from '../../../core/schema';
import { addBacklogItem } from '../../actions';
import { AddInput } from './AddInput';
import { BacklogRow } from './BacklogRow';

export function BacklogView(props: { root: Root }) {
  const { root } = props;
  const projects = root.projects.filter((p) => !p.archived);

  return (
    <article aria-labelledby="pane-title">
      <header class="mb-24 flex flex-wrap items-start justify-between gap-x-20 gap-y-10">
        <h2 id="pane-title" class="text-24 leading-[1.25] font-semibold tracking-[-0.015em] text-ink">
          Backlog
        </h2>
      </header>

      <AddInput placeholder="Capture an idea…" label="Add to backlog" shortcut="new-backlog" onAdd={addBacklogItem} />

      {root.backlog.length > 0 && (
        <ul class="mt-14 grid grid-cols-1 overflow-hidden rounded-14 border border-line bg-card shadow-card [&>li+li]:border-t [&>li+li]:border-line">
          {[...root.backlog].reverse().map((item) => (
            <BacklogRow key={item.id} item={item} projects={projects} />
          ))}
        </ul>
      )}
    </article>
  );
}
