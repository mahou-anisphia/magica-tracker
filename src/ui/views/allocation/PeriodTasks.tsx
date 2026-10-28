import { useState } from 'preact/hooks';
import { loadGroups, type LoadGroup } from '../../../core/domains';
import { calendarDay, plural, shortDay } from '../../../core/format';
import { dayNumber } from '../../../core/period';
import { eventWork, type Allocation, type LoadItem } from '../../../core/progress';
import type { Root } from '../../../core/schema';
import { localDateStamp } from '../../../core/time';
import { openDay, openProject } from '../../actions';
import { ChevronIcon } from '../../components/icons';
import { useLoadFormat } from '../../components/useUnit';

/**
 * "Done 24 Sep", "Done 24 Sep, due 18 Sep" when late, or "Open"; "· spread"
 * when a start date (an event's last day) spreads it.
 */
function when(item: LoadItem): string {
  const { done, doneAt, due, startsOn } = item.kind === 'task' ? item.task : eventWork(item.entry);
  let text = 'Open';
  if (done && doneAt) {
    text = `Done ${shortDay(doneAt)}`;
    if (due && dayNumber(localDateStamp(new Date(doneAt))) > dayNumber(due)) text += `, ${item.kind === 'task' ? 'due' : 'on'} ${calendarDay(due)}`;
  }
  return startsOn && due ? `${text} · spread` : text;
}

const KIND: Record<LoadGroup['kind'], (g: LoadGroup) => string> = {
  domain: (g) => `Domain · ${plural(g.projects, 'project')}`,
  project: () => 'Project',
  events: () => 'No project',
};

const itemKey = (i: LoadItem) => (i.kind === 'task' ? `${i.project.id}/${i.task.id}` : `event/${i.entry.id}`);

/**
 * What filled one period, by domain (a project with no domain on its own),
 * largest first. Each group shows its share and opens to the tasks in it:
 * each task, its project, when it was done, and its share.
 */
export function PeriodTasks(props: { root: Root; allocation: Allocation }) {
  const { items, period } = props.allocation;
  const fmt = useLoadFormat(period);
  const [open, setOpen] = useState<Set<string>>(new Set());
  if (!items.length) return <p class="text-14 text-body">Nothing was allocated this {period}.</p>;
  const groups = loadGroups(props.root, items);
  const allOpen = groups.every((g) => open.has(g.key));
  const toggle = (key: string) => {
    const next = new Set(open);
    if (!next.delete(key)) next.add(key);
    setOpen(next);
  };

  return (
    <div class="grid grid-cols-1 gap-6">
      <button
        type="button"
        class="btn btn-quiet btn-small justify-self-end text-primary-ink"
        onClick={() => setOpen(allOpen ? new Set() : new Set(groups.map((g) => g.key)))}
      >
        {allOpen ? 'Collapse all' : 'Show every task'}
      </button>
      <ul class="-mx-22 border-t border-line max-md:-mx-16">
        {groups.map((g) => {
          const id = `period-group-${g.key}`;
          const shown = open.has(g.key);
          return (
            <li key={g.key} class="border-b border-line last:border-b-0">
              <button
                type="button"
                class="group flex w-full cursor-pointer items-center gap-12 px-22 py-12 text-left hover:bg-page-70 max-md:px-16"
                aria-expanded={shown}
                aria-controls={id}
                onClick={() => toggle(g.key)}
              >
                <span class="inline-flex text-body transition-transform group-aria-expanded:rotate-180">
                  <ChevronIcon dir="down" />
                </span>
                <span class="grid min-w-0 flex-1 grid-cols-1">
                  <span class="truncate font-medium text-ink group-hover:text-primary-ink">{g.name}</span>
                  <span class="text-12 text-body">
                    {KIND[g.kind](g)} · {plural(g.items.length, g.kind === 'events' ? 'event' : 'task')}
                  </span>
                </span>
                <span class="relative h-8 w-140 flex-none overflow-hidden rounded-full bg-chip-70 max-md:hidden" aria-hidden="true">
                  <span class="absolute inset-y-0 left-0 bg-primary-strong" style={{ width: `${Math.min(g.share, 100)}%` }} />
                </span>
                <span class="w-60 flex-none text-right font-medium text-ink tabular-nums">{fmt(g.share)}</span>
              </button>
              {shown && (
                <table id={id} class="mb-8 w-full border-collapse text-14">
                  <thead class="sr-only">
                    <tr>
                      <th scope="col">Task</th>
                      <th scope="col">When</th>
                      <th scope="col">Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.items.map((item) => (
                      <tr key={itemKey(item)} class="border-t border-line">
                        <td class="py-8 pr-12 pl-50 max-md:pl-16">
                          <button
                            type="button"
                            class="cursor-pointer text-left font-medium text-ink hover:text-primary-ink"
                            onClick={() => (item.kind === 'task' ? openProject(item.project.id, item.task.id) : openDay(item.entry.date))}
                          >
                            {item.kind === 'task' ? item.task.title : item.entry.title}
                          </button>
                          {g.domain && item.kind === 'task' && <span class="block text-12 text-body">{item.project.name}</span>}
                          {item.kind === 'event' && <span class="block text-12 text-body">{calendarDay(item.entry.date)}{item.entry.time && `, ${item.entry.time}`}</span>}
                        </td>
                        <td class="px-12 py-8">
                          <span class="pill pill-plain max-md:whitespace-normal">{when(item)}</span>
                        </td>
                        <td class="py-8 pr-22 pl-12 text-right whitespace-nowrap text-body tabular-nums max-md:pr-16">{fmt(item.share)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
