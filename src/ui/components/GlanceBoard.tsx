import { useState } from 'preact/hooks';
import { subtaskProgress } from '../../core/completion';
import { daysUntil, dueDistance, isDueSoon } from '../../core/due';
import { plural } from '../../core/format';
import { glanceLists, type GlanceLists, type GlanceRef } from '../../core/glance';
import { allocation } from '../../core/progress';
import { allocationSettings, type Root } from '../../core/schema';
import { daysSince } from '../../core/time';
import { AllocationBar } from './AllocationBar';
import { GlanceNumbers, type GlanceItem } from './GlanceNumbers';
import { CrossIcon } from './icons';
import { LabelledBlock } from './LabelledBlock';
import { ListRow, type RowTone } from './ListRow';
import { ShowMoreRow } from './ShowMoreRow';
import { useLoadFormat } from './useUnit';

type ListKey = keyof GlanceLists;

/** How many rows show before "Show more". */
const FIRST = 5;

const LINE: Record<ListKey, (n: number) => string> = {
  open: (n) => `${n} open, most pressing first`,
  inProgress: (n) => `${n} in progress`,
  waiting: (n) => `${n} waiting, longest first`,
  overdue: (n) => `${n} past ${n === 1 ? 'its' : 'their'} deadline`,
};

type Pill = { text: string; class: string };

/** A row's mark, words and pills: what made it count, and its allocation. */
function describe(ref: GlanceRef, list: ListKey, now: Date, fmtLoad: (percent: number) => string): { tone: RowTone; title: string; sub: string; pills: Pill[] } {
  const { project, task, subtask } = ref;
  if (list === 'overdue' || !task) {
    const due = subtask?.due ?? task?.due ?? project.due!;
    return {
      tone: 'watch',
      title: subtask?.title ?? task?.title ?? project.name,
      sub: subtask && task ? `${task.title} · ${project.name}` : task ? project.name : 'Project deadline',
      pills: [{ text: dueDistance(daysUntil(due, now)), class: 'pill-watch' }],
    };
  }
  const steps = subtaskProgress(task);
  const sub = [project.name, task.waiting?.on, steps.total ? `${steps.done} of ${plural(steps.total, 'sub-task')}` : undefined]
    .filter(Boolean)
    .join(' · ');
  const effort: Pill[] = task.effort ? [{ text: fmtLoad(task.effort), class: 'pill-plain' }] : [];
  const waited = task.waiting ? daysSince(task.waiting.since, now) : 0;
  const [tone, pill]: [RowTone, Pill | null] =
    task.status === 'waiting'
      ? ['waiting', { text: waited > 0 ? `Waiting ${waited}d` : 'Waiting', class: 'pill-outline' }]
      : isDueSoon(task.due, false, now)
        ? ['watch', { text: dueDistance(daysUntil(task.due!, now)), class: 'pill-watch' }]
        : task.priority === 'urgent'
          ? ['urgent', { text: 'Urgent', class: 'pill-urgent' }]
          : [
              task.status === 'working' ? 'working' : 'plain',
              task.priority === 'high'
                ? { text: 'High', class: 'pill-high' }
                : task.due
                  ? { text: dueDistance(daysUntil(task.due, now)), class: 'pill-plain' }
                  : null,
            ];
  return { tone, title: task.title, sub, pills: [...effort, ...(pill ? [pill] : [])] };
}

/**
 * "At a glance": four numbers, each opening the list of what it counts, over
 * the allocation bar. The Overview and View as both show this one card, so
 * they never drift apart. With `onOpen`, a row opens its task; without it
 * (someone else's file) the rows are read-only. With `whose`, the allocation
 * is someone else's, by their own settings. Archived and done projects don't
 * count.
 */
export function GlanceBoard(props: { root: Root; now: Date; whose?: string; onOpen?: (ref: GlanceRef) => void }) {
  const { root, now, onOpen } = props;
  const [chosen, setChosen] = useState<ListKey | null>(null);
  const [all, setAll] = useState(false);
  // Allocations are shares of this tracker's own period.
  const fmtLoad = useLoadFormat(allocationSettings(root).period);
  const lists = glanceLists(root, now);
  // A list that empties (its last task done) closes.
  const open = chosen && lists[chosen].length ? chosen : null;
  const items: GlanceItem[] = [
    { key: 'open', label: 'Open tasks', value: lists.open.length, tone: 'plain' },
    { key: 'inProgress', label: 'In progress', value: lists.inProgress.length, tone: 'plain' },
    { key: 'waiting', label: 'Waiting', value: lists.waiting.length, tone: 'plain' },
    { key: 'overdue', label: 'Overdue', value: lists.overdue.length, tone: 'gold' },
  ];
  const rows = open ? lists[open] : [];
  const more = rows.length - FIRST;

  return (
    <LabelledBlock id="glance-h" title="At a glance">
      <div class="overflow-hidden rounded-14 border border-line bg-card shadow-card">
        <GlanceNumbers
          items={items}
          open={open}
          controls="glance-list"
          onToggle={(key) => {
            setChosen(open === key ? null : (key as ListKey));
            setAll(false);
          }}
        />
        {open && (
          <div id="glance-list" class="border-t border-line">
            <div class="flex items-center justify-between gap-12 pt-10 pr-12 pb-4 pl-20">
              <span class="text-13 font-medium text-body">{LINE[open](rows.length)}</span>
              <button type="button" class="icon-btn" aria-label="Close the list" onClick={() => setChosen(null)}>
                <CrossIcon />
              </button>
            </div>
            <ul class="[&>li]:border-t [&>li]:border-line">
              {(all ? rows : rows.slice(0, FIRST)).map((ref) => {
                const d = describe(ref, open, now, fmtLoad);
                return (
                  <li key={`${ref.project.id}/${ref.task?.id ?? ''}/${ref.subtask?.id ?? ''}`}>
                    <ListRow tone={d.tone} title={d.title} sub={d.sub} onOpen={onOpen && (() => onOpen(ref))}>
                      {d.pills.map((p) => (
                        <span key={p.text} class={`pill ${p.class}`}>
                          {p.text}
                        </span>
                      ))}
                    </ListRow>
                  </li>
                );
              })}
              {more > 0 && (
                <li>
                  <ShowMoreRow more={more} expanded={all} onToggle={() => setAll(!all)} />
                </li>
              )}
            </ul>
          </div>
        )}
        <AllocationBar allocation={allocation(root, now)} embedded whose={props.whose} />
      </div>
    </LabelledBlock>
  );
}
