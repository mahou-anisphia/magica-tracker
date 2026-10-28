import { useState } from 'preact/hooks';
import { dueByDate, monthGrid } from '../../core/calendar';
import { monthHeading } from '../../core/format';
import type { Root } from '../../core/schema';
import { localDateStamp } from '../../core/time';
import { daysOff } from '../../core/workdays';
import { ChevronIcon, PlusIcon } from './icons';
import { CalendarItem } from './CalendarItem';
import { dayCount, itemKey, itemTone, panelDay, parseDay } from './dueItem';

const weekdayShort = new Intl.DateTimeFormat(undefined, { weekday: 'short' });
const agendaDay = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
// 2024-01-01 was a Monday.
const WEEKDAYS = Array.from({ length: 7 }, (_, i) => weekdayShort.format(new Date(2024, 0, 1 + i)));

/** Deadlines shown in a day cell, most urgent first; the rest open with the day. */
const CELL_ITEMS = 3;

/** Phone dots under a day's date. */
const DOT = { done: 'bg-line-strong', urgent: 'bg-primary-strong', watch: 'bg-watch-mark', open: 'bg-ink' };

/**
 * A day cell. 132px fits the date and CELL_ITEMS (3) items exactly, so every
 * week is one height; anything beyond goes behind "+N more".
 */
function cellClass(opts: { inMonth: boolean; selected: boolean; off: boolean }): string {
  const bg = opts.selected ? 'bg-primary-tint' : `${opts.inMonth ? '' : 'bg-page-60'} hover:bg-page-80`;
  return `h-132 cursor-pointer overflow-hidden border-x border-b border-line p-8 align-top first:border-l-0 last:border-r-0 group-last/week:border-b-0 max-sm:h-64 max-sm:px-2 max-sm:py-4 max-sm:text-center ${bg} ${opts.off ? 'bg-off' : ''}`;
}

function dateClass(opts: { inMonth: boolean; today: boolean }): string {
  const color = opts.today ? 'bg-primary text-on-primary' : opts.inMonth ? 'bg-transparent text-ink' : 'bg-transparent text-faint';
  return `-ml-4 inline-flex h-28 min-w-28 flex-none cursor-pointer items-center justify-center rounded-full px-6 text-14 tabular-nums max-sm:m-0 max-sm:text-13 ${opts.inMonth ? 'font-medium' : 'font-normal'} ${color}`;
}

/**
 * Deadlines and events on a month grid, Monday first, today circled.
 * Unfinished items in a soft chip (events outlined), approaching or overdue
 * ones in the highlight colour, done ones recede. Leave and holidays stripe
 * their day and name it. A cell shows its 3 most urgent items and "+N more",
 * so every week keeps one height. Clicking a day (or anything on it) calls
 * `onOpenDay`; the caller shows that day. Below 640px the cells show dots and
 * an agenda lists the month. Your Timeline and a member's ("View as") both
 * use it; `whose` names the member, and `onAdd` (yours only) adds the + Add
 * button.
 */
export function MonthCalendar(props: {
  root: Root;
  now: Date;
  /** The day open beside the calendar, as "2026-10-04". */
  day: string | null;
  onOpenDay: (date: string, itemKey: string | null) => void;
  whose?: string;
  onAdd?: () => void;
}) {
  const { root, now } = props;
  // Opened on a day (from Allocation, say): start on that day's month.
  const [cursor, setCursor] = useState(() => {
    const d = props.day ? parseDay(props.day) : now;
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const weeks = monthGrid(cursor.y, cursor.m);
  const items = dueByDate(root, now);
  const off = daysOff(root);
  const today = localDateStamp(now);
  const isThisMonth = cursor.y === now.getFullYear() && cursor.m === now.getMonth();

  const shift = (delta: number) =>
    setCursor((c) => {
      const d = new Date(c.y, c.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  const openDay = (date: string, key: string | null = null) => props.onOpenDay(date, key);

  const monthDays = weeks.flat().filter((d) => d.inMonth && (items.has(d.date) || off.has(d.date)));

  return (
    <section aria-labelledby="timeline-h">
      <header class="mb-20 flex items-center justify-between gap-12">
        <h1 id="timeline-h" class="m-0 text-heading leading-[1.2] tracking-[-0.015em]" aria-live="polite">
          {props.whose ? `${props.whose}’s ` : ''}
          {monthHeading(new Date(cursor.y, cursor.m, 1))}
        </h1>
        <ul class="ml-auto flex flex-wrap gap-x-14 gap-y-4 text-13 text-body max-md:hidden" aria-label="Colours">
          <li class="inline-flex items-center gap-6">
            <span class="h-10 w-14 rounded-2 bg-primary" aria-hidden="true" />
            Urgent
          </li>
          <li class="inline-flex items-center gap-6">
            <span class="h-10 w-14 rounded-2 bg-watch-tint inset-ring inset-ring-watch" aria-hidden="true" />
            Due soon or overdue
          </li>
          <li class="inline-flex items-center gap-6">
            <span class="h-10 w-14 rounded-2 bg-chip" aria-hidden="true" />
            Other
          </li>
          <li class="inline-flex items-center gap-6">
            <span class="h-10 w-14 rounded-2 bg-card inset-ring inset-ring-line-strong" aria-hidden="true" />
            Event
          </li>
          <li class="inline-flex items-center gap-6">
            <span class="h-10 w-14 rounded-2 bg-card bg-off inset-ring inset-ring-line" aria-hidden="true" />
            Leave or holiday
          </li>
        </ul>
        <div class="flex items-center gap-4">
          {props.onAdd && (
            <button type="button" class="btn btn-small mr-6" data-shortcut="add-entry" onClick={props.onAdd}>
              <PlusIcon size={14} />
              Add
            </button>
          )}
          <button
            type="button"
            class="icon-btn min-h-(--tap) min-w-(--tap)"
            aria-label="Previous month"
            onClick={() => shift(-1)}
          >
            <ChevronIcon dir="left" />
          </button>
          <button
            type="button"
            class="btn btn-quiet btn-small"
            disabled={isThisMonth}
            onClick={() => setCursor({ y: now.getFullYear(), m: now.getMonth() })}
          >
            Today
          </button>
          <button
            type="button"
            class="icon-btn min-h-(--tap) min-w-(--tap)"
            aria-label="Next month"
            onClick={() => shift(1)}
          >
            <ChevronIcon dir="right" />
          </button>
        </div>
      </header>

      <div class="overflow-hidden rounded-16 border border-line bg-card shadow-card">
        <table class="w-full table-fixed border-collapse">
          <thead>
            <tr>
              {WEEKDAYS.map((w) => (
                <th
                  key={w}
                  scope="col"
                  class="border-b border-line px-4 py-12 text-13 font-medium text-body max-sm:px-0 max-sm:py-10 max-sm:text-12"
                >
                  {w}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.map((week) => (
              <tr key={week[0]!.date} class="group/week">
                {week.map((d) => {
                  const list = items.get(d.date) ?? [];
                  const dayOff = off.get(d.date);
                  const isToday = d.date === today;
                  const hidden = Math.max(0, list.length - CELL_ITEMS);
                  return (
                    <td
                      key={d.date}
                      class={cellClass({ inMonth: d.inMonth, selected: props.day === d.date, off: !!dayOff })}
                      aria-current={isToday ? 'date' : undefined}
                      onClick={() => openDay(d.date)}
                    >
                      <div class="-mt-2 mb-4 flex items-center justify-between gap-4 max-sm:mt-0 max-sm:mb-2 max-sm:justify-center">
                        <button
                          type="button"
                          class={dateClass({ inMonth: d.inMonth, today: isToday })}
                          aria-label={`${panelDay.format(parseDay(d.date))}${isToday ? ', today' : ''}${dayOff ? `, ${dayOff.title}` : ''}: ${dayCount(list)}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            openDay(d.date);
                          }}
                        >
                          {d.day}
                        </button>
                        {dayOff && (
                          <span class="min-w-0 flex-1 truncate text-12 font-medium text-body max-sm:hidden" title={dayOff.title} aria-hidden="true">
                            {dayOff.title}
                          </span>
                        )}
                        {hidden > 0 && (
                          <button
                            type="button"
                            class="-mr-4 min-w-0 cursor-pointer truncate rounded-full bg-transparent px-6 py-2 text-12 font-medium text-body tabular-nums hover:bg-primary-tint hover:text-primary-ink max-sm:hidden"
                            aria-label={`${hidden} more on ${panelDay.format(parseDay(d.date))}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              openDay(d.date);
                            }}
                          >
                            +{hidden} more
                          </button>
                        )}
                      </div>
                      {list.length > 0 && (
                        <>
                          {/* minmax(0, …) columns, so long no-wrap titles never push chips out of the cell. */}
                          <ul class="grid grid-cols-1 gap-4 max-sm:hidden">
                            {list.slice(0, CELL_ITEMS).map((it) => (
                              <li key={itemKey(it)}>
                                <CalendarItem
                                  item={it}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openDay(d.date, itemKey(it));
                                  }}
                                />
                              </li>
                            ))}
                          </ul>
                          <span class="hidden justify-center gap-3 max-sm:flex" aria-hidden="true">
                            {list.slice(0, CELL_ITEMS).map((it) => (
                              <i key={itemKey(it)} class={`size-6 rounded-full ${DOT[itemTone(it)]}`} />
                            ))}
                          </span>
                        </>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {monthDays.length > 0 && (
        <ol class="mt-20 hidden grid-cols-1 gap-14 max-sm:grid">
          {monthDays.map((d) => (
            <li key={d.date} class="grid grid-cols-1 gap-6">
              <span class={`text-13 font-medium ${d.date === today ? 'text-ink' : 'text-body'}`}>
                {agendaDay.format(new Date(cursor.y, cursor.m, d.day))}
                {off.has(d.date) && ` · ${off.get(d.date)!.title}`}
              </span>
              <ul class="grid grid-cols-1 gap-6">
                {(items.get(d.date) ?? []).map((it) => (
                  <li key={itemKey(it)}>
                    <CalendarItem item={it} agenda onClick={() => openDay(d.date, itemKey(it))} />
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
