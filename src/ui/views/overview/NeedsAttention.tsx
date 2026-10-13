import { useState } from 'preact/hooks';
import { attention } from '../../../core/attention';
import { dueDistance } from '../../../core/due';
import type { Root } from '../../../core/schema';
import { openProject } from '../../actions';
import { LabelledBlock } from '../../components/LabelledBlock';

/** How many items show before "Show more". */
const FIRST = 3;

type Item = {
  key: string;
  title: string;
  sub: string;
  pill: string;
  tone: 'watch' | 'waiting' | 'urgent';
  open: () => void;
};

const ROW = 'flex w-full cursor-pointer items-center bg-transparent text-left hover:bg-page-70';
const DOT: Record<Item['tone'], string> = {
  watch: 'rounded-full border-watch bg-watch',
  waiting: 'rounded-2 border-ink bg-ink',
  urgent: 'rounded-full border-primary-strong bg-primary-strong',
};
const PILL: Record<Item['tone'], string> = { watch: 'pill-watch', waiting: 'pill-outline', urgent: 'pill-urgent' };

/**
 * What needs you, most pressing first: overdue and approaching deadlines,
 * then waiting tasks, then urgent ones, then tasks gone quiet. Three at a time, so a busy week
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
    ...a.waiting.map(({ project, task, days }) => ({
      key: task.id,
      title: task.title,
      sub: task.waiting?.on ? `${project.name} · ${task.waiting.on}` : project.name,
      pill: days > 0 ? `Waiting ${days}d` : 'Waiting',
      tone: 'waiting' as const,
      open: () => openProject(project.id, task.id),
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
    <LabelledBlock id="attention-h" title="Needs attention">
      <ul class="overflow-hidden rounded-14 border border-line bg-card shadow-card [&>li+li]:border-t [&>li+li]:border-line">
        {shown.map((it) => (
          <li key={it.key}>
            <button type="button" class={`group ${ROW} min-h-64 gap-14 px-20 py-12`} onClick={it.open}>
              <span class={`size-8 flex-none border-[1.5px] ${DOT[it.tone]}`} aria-hidden="true" />
              <span class="grid min-w-0 flex-1 grid-cols-1 gap-1">
                <span class="truncate font-medium text-ink group-hover:text-primary-ink" title={it.title}>
                  {it.title}
                </span>
                <span class="truncate text-13 text-body" title={it.sub}>
                  {it.sub}
                </span>
              </span>
              <span class={`pill ${PILL[it.tone]}`}>{it.pill}</span>
            </button>
          </li>
        ))}
        {more > 0 && (
          <li>
            <button
              type="button"
              class={`${ROW} min-h-46 justify-center gap-14 px-20 py-12 text-14 font-medium text-primary-ink`}
              aria-expanded={expanded}
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? 'Show less' : `Show ${more} more`}
            </button>
          </li>
        )}
      </ul>
    </LabelledBlock>
  );
}
