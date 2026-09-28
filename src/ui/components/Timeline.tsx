import { useState } from 'preact/hooks';
import { dueByDate, monthGrid, type DueItem } from '../../core/calendar';
import type { Root } from '../../core/schema';
import { localDateStamp } from '../../core/time';
import { openProject } from '../actions';
import { ChevronIcon } from './icons';

const monthTitle = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' });
const weekdayShort = new Intl.DateTimeFormat(undefined, { weekday: 'short' });
const agendaDay = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
// 2024-01-01 was a Monday.
const WEEKDAYS = Array.from({ length: 7 }, (_, i) => weekdayShort.format(new Date(2024, 0, 1 + i)));

/**
 * Deadlines on a month grid, Monday first. Today is circled. Unfinished items
 * sit in Frost, approaching or overdue ones in amber, done ones recede.
 * Below 640px the cells show dots and an agenda lists the month instead.
 */
export function Timeline(props: { root: Root; now: Date }) {
  const { root, now } = props;
  const [cursor, setCursor] = useState(() => ({ y: now.getFullYear(), m: now.getMonth() }));
  const weeks = monthGrid(cursor.y, cursor.m);
  const items = dueByDate(root, now);
  const today = localDateStamp(now);
  const isThisMonth = cursor.y === now.getFullYear() && cursor.m === now.getMonth();

  const shift = (delta: number) =>
    setCursor((c) => {
      const d = new Date(c.y, c.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });

  const monthDays = weeks.flat().filter((d) => d.inMonth && items.has(d.date));

  return (
    <section class="timeline" aria-labelledby="timeline-h">
      <header class="tl-head">
        <h1 id="timeline-h" class="pane-title" aria-live="polite">
          {monthTitle.format(new Date(cursor.y, cursor.m, 1))}
        </h1>
        <div class="tl-nav">
          <button type="button" class="icon-btn" aria-label="Previous month" onClick={() => shift(-1)}>
            <ChevronIcon dir="left" />
          </button>
          <button
            type="button"
            class="btn quiet small"
            disabled={isThisMonth}
            onClick={() => setCursor({ y: now.getFullYear(), m: now.getMonth() })}
          >
            Today
          </button>
          <button type="button" class="icon-btn" aria-label="Next month" onClick={() => shift(1)}>
            <ChevronIcon dir="right" />
          </button>
        </div>
      </header>

      <table class="cal">
        <thead>
          <tr>
            {WEEKDAYS.map((w) => (
              <th key={w} scope="col">
                {w}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week) => (
            <tr key={week[0]!.date}>
              {week.map((d) => {
                const list = items.get(d.date) ?? [];
                const isToday = d.date === today;
                return (
                  <td
                    key={d.date}
                    class={`${d.inMonth ? '' : 'outside'} ${isToday ? 'today' : ''}`}
                    aria-current={isToday ? 'date' : undefined}
                  >
                    <span class="cal-date">
                      {d.day}
                      {isToday && <span class="sr-only"> (today)</span>}
                    </span>
                    {list.length > 0 && (
                      <>
                        <ul class="cal-items">
                          {list.map((it) => (
                            <li key={itemKey(it)}>
                              <ItemChip item={it} />
                            </li>
                          ))}
                        </ul>
                        <span class="cal-dots" aria-hidden="true">
                          {list.slice(0, 3).map((it) => (
                            <i key={itemKey(it)} class={itemClass(it)} />
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

      {monthDays.length > 0 && (
        <ol class="agenda">
          {monthDays.map((d) => (
            <li key={d.date} class={d.date === today ? 'today' : ''}>
              <span class="agenda-date">{agendaDay.format(new Date(cursor.y, cursor.m, d.day))}</span>
              <ul>
                {items.get(d.date)!.map((it) => (
                  <li key={itemKey(it)}>
                    <ItemChip item={it} />
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

function itemKey(it: DueItem): string {
  return it.subtask?.id ?? it.task?.id ?? `project-${it.project.id}`;
}

function itemClass(it: DueItem): string {
  const kind = it.task ? '' : 'project';
  if (it.done) return `done ${kind}`;
  return `${it.watch ? 'watch' : ''} ${kind}`;
}

function ItemChip({ item }: { item: DueItem }) {
  let where = 'Project deadline';
  if (item.subtask && item.task) where = `${item.task.title} · ${item.project.name}`;
  else if (item.task) where = item.project.name;
  return (
    <button
      type="button"
      class={`cal-item ${itemClass(item)}`}
      title={`${item.title} — ${where}`}
      onClick={() => openProject(item.project.id, item.task?.id ?? null)}
    >
      <span class="cal-item-title">{item.title}</span>
      <span class="sr-only">
        , {where}
        {item.done ? ', done' : ''}
      </span>
    </button>
  );
}
