import { useState } from 'preact/hooks';
import { attention } from '../../core/attention';
import { dueDistance } from '../../core/due';
import type { Root } from '../../core/schema';
import { openProject } from '../actions';

/** How many items show before "Show more". */
const FIRST = 3;

type Item = {
  key: string;
  title: string;
  sub: string;
  pill: string;
  tone: 'watch' | 'urgent';
  open: () => void;
};

/**
 * What needs you, most pressing first: overdue and approaching deadlines,
 * then urgent tasks, then tasks gone quiet. Three at a time, so a busy week
 * doesn't flood the page. Hidden entirely when nothing qualifies.
 */
export function NeedsAttention(props: { root: Root; now: Date }) {
  const [expanded, setExpanded] = useState(false);
  const a = attention(props.root, props.now);

  const items: Item[] = [
    ...a.due.map(({ project, task, subtask, days }) => ({
      key: subtask?.id ?? task?.id ?? `project-${project.id}`,
      title: subtask?.title ?? task?.title ?? project.name,
      sub: subtask && task ? `${task.title} · ${project.name}` : task ? project.name : 'Project deadline',
      pill: dueDistance(days),
      tone: 'watch' as const,
      open: () => openProject(project.id, task?.id ?? null),
    })),
    ...a.urgent.map(({ project, task }) => ({
      key: task.id,
      title: task.title,
      sub: project.name,
      pill: 'Urgent',
      tone: 'urgent' as const,
      open: () => openProject(project.id, task.id),
    })),
    ...a.stale.map(({ project, task, days }) => ({
      key: task.id,
      title: task.title,
      sub: project.name,
      pill: `untouched ${days}d`,
      tone: 'watch' as const,
      open: () => openProject(project.id, task.id),
    })),
  ];
  if (items.length === 0) return null;

  const shown = expanded ? items : items.slice(0, FIRST);
  const more = items.length - FIRST;

  return (
    <section class="block" aria-labelledby="attention-h">
      <div class="block-head">
        <h2 id="attention-h">Needs attention</h2>
      </div>
      <ul class="card list">
        {shown.map((it) => (
          <li key={it.key}>
            <button type="button" class="row" onClick={it.open}>
              <span class={`dot ${it.tone}`} aria-hidden="true" />
              <span class="row-main">
                <span class="row-title" title={it.title}>
                  {it.title}
                </span>
                <span class="row-sub" title={it.sub}>
                  {it.sub}
                </span>
              </span>
              <span class={`pill ${it.tone}`}>{it.pill}</span>
            </button>
          </li>
        ))}
        {more > 0 && (
          <li>
            <button type="button" class="row more" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
              {expanded ? 'Show less' : `Show ${more} more`}
            </button>
          </li>
        )}
      </ul>
    </section>
  );
}
