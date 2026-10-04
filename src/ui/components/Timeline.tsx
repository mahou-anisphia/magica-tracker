import { useState } from 'preact/hooks';
import { dueByDate, monthGrid, type DueItem } from '../../core/calendar';
import { daysUntil, dueDistance } from '../../core/due';
import { plural } from '../../core/format';
import * as ops from '../../core/ops';
import { projectProgress } from '../../core/progress';
import type { Root } from '../../core/schema';
import { localDateStamp } from '../../core/time';
import { openProject, setProjectDone, toggleTask } from '../actions';
import { set, update } from '../store';
import { ChevronIcon, CrossIcon } from './icons';
import { Modal } from './Modal';
import { EffortMeter, PriorityChip } from './Progress';

const monthTitle = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' });
const weekdayShort = new Intl.DateTimeFormat(undefined, { weekday: 'short' });
const agendaDay = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
const panelDay = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
// 2024-01-01 was a Monday.
const WEEKDAYS = Array.from({ length: 7 }, (_, i) => weekdayShort.format(new Date(2024, 0, 1 + i)));

const parseDay = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y!, m! - 1, d!);
};

/**
 * Deadlines on a month grid, Monday first, today circled. Unfinished items in
 * Frost, approaching or overdue ones in amber, done ones recede. Clicking a
 * day (or anything on it) opens that day in a side panel. Below 640px the
 * cells show dots and an agenda lists the month.
 */
export function Timeline(props: { root: Root; now: Date; day: string | null }) {
  const { root, now } = props;
  const [cursor, setCursor] = useState(() => ({ y: now.getFullYear(), m: now.getMonth() }));
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const weeks = monthGrid(cursor.y, cursor.m);
  const items = dueByDate(root, now);
  const today = localDateStamp(now);
  const isThisMonth = cursor.y === now.getFullYear() && cursor.m === now.getMonth();

  const shift = (delta: number) =>
    setCursor((c) => {
      const d = new Date(c.y, c.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  const openDay = (date: string, key: string | null = null) => {
    setFocusKey(key);
    set({ day: date });
  };

  const monthDays = weeks.flat().filter((d) => d.inMonth && items.has(d.date));

  return (
    <section class="timeline" aria-labelledby="timeline-h">
      <header class="tl-head">
        <h1 id="timeline-h" class="today" aria-live="polite">
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

      <div class="cal-card">
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
                      class={`${d.inMonth ? '' : 'outside'} ${isToday ? 'today' : ''} ${props.day === d.date ? 'selected' : ''}`}
                      aria-current={isToday ? 'date' : undefined}
                      onClick={() => openDay(d.date)}
                    >
                      <button
                        type="button"
                        class="cal-date"
                        aria-label={`${panelDay.format(parseDay(d.date))}${isToday ? ', today' : ''}: ${plural(list.length, 'deadline')}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          openDay(d.date);
                        }}
                      >
                        {d.day}
                      </button>
                      {list.length > 0 && (
                        <>
                          <ul class="cal-items">
                            {list.map((it) => (
                              <li key={itemKey(it)}>
                                <button
                                  type="button"
                                  class={`cal-item ${itemClass(it)}`}
                                  title={`${it.title} — ${where(it)}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openDay(d.date, itemKey(it));
                                  }}
                                >
                                  <span class="cal-item-title">{it.title}</span>
                                </button>
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
      </div>

      {monthDays.length > 0 && (
        <ol class="agenda">
          {monthDays.map((d) => (
            <li key={d.date} class={d.date === today ? 'today' : ''}>
              <span class="agenda-date">{agendaDay.format(new Date(cursor.y, cursor.m, d.day))}</span>
              <ul>
                {items.get(d.date)!.map((it) => (
                  <li key={itemKey(it)}>
                    <button
                      type="button"
                      class={`cal-item ${itemClass(it)}`}
                      onClick={() => openDay(d.date, itemKey(it))}
                    >
                      <span class="cal-item-title">{it.title}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      )}

      <DayPanel
        date={props.day}
        items={props.day ? (items.get(props.day) ?? []) : []}
        now={now}
        focusKey={focusKey}
        onClose={() => set({ day: null })}
      />
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

function where(it: DueItem): string {
  if (it.subtask && it.task) return `${it.task.title} · ${it.project.name}`;
  if (it.task) return it.project.name;
  return 'Project deadline';
}

/** One day's deadlines in a panel from the right; each row opens to details and quick actions. */
function DayPanel(props: { date: string | null; items: DueItem[]; now: Date; focusKey: string | null; onClose: () => void }) {
  const { date, items, now } = props;
  return (
    <Modal open={!!date} onClose={props.onClose} labelledBy="day-h" variant="drawer">
      {date && (
        <>
          <header class="drawer-head">
            <div>
              <h2 id="day-h">{panelDay.format(parseDay(date))}</h2>
              <p class="drawer-sub">{items.length ? plural(items.length, 'deadline') : 'No deadlines'}</p>
            </div>
            <button type="button" class="icon-btn" aria-label="Close" onClick={props.onClose}>
              <CrossIcon />
            </button>
          </header>
          <ul class="drawer-list">
            {items.map((it) => (
              <DayItem key={itemKey(it)} item={it} now={now} startOpen={props.focusKey === itemKey(it)} />
            ))}
          </ul>
        </>
      )}
    </Modal>
  );
}

function DayItem({ item, now, startOpen }: { item: DueItem; now: Date; startOpen: boolean }) {
  const [open, setOpen] = useState(startOpen);
  const { project, task, subtask } = item;
  const due = subtask?.due ?? task?.due ?? project.due;
  const status = item.done ? 'Done' : due && item.watch ? dueDistance(daysUntil(due, now)) : null;
  const detailId = `day-item-${itemKey(item)}`;

  return (
    <li class={`drawer-item ${item.done ? 'is-done' : ''}`}>
      <button type="button" class="drawer-row" aria-expanded={open} aria-controls={detailId} onClick={() => setOpen(!open)}>
        <span class="row-main">
          <span class="row-title" title={item.title}>
            {item.title}
          </span>
          <span class="row-sub" title={where(item)}>
            {where(item)}
          </span>
        </span>
        {status ? <span class={`pill ${item.done ? 'plain' : 'watch'}`}>{status}</span> : <PriorityChip priority={task?.priority} />}
        <span class={`chev ${open ? 'open' : ''}`}>
          <ChevronIcon dir="down" />
        </span>
      </button>
      {open && (
        <div id={detailId} class="drawer-detail">
          {task && !subtask && (
            <>
              <div class="drawer-facts">
                <PriorityChip priority={task.priority} />
                {task.effort !== undefined && <span class="pill plain">{task.effort}% effort</span>}
                {task.subtasks.length > 0 && (
                  <span class="pill plain">
                    {task.subtasks.filter((s) => s.done).length} / {task.subtasks.length} sub-tasks
                  </span>
                )}
              </div>
              {task.notes && <p class="drawer-notes">{task.notes}</p>}
            </>
          )}
          {!task && <EffortMeter progress={projectProgress(project)} />}
          <div class="drawer-actions">
            {task && !subtask && (
              <button type="button" class="btn small" onClick={() => void toggleTask(project.id, task, !task.done)}>
                {task.done ? 'Reopen' : 'Mark done'}
              </button>
            )}
            {task && subtask && (
              <button
                type="button"
                class="btn small"
                onClick={() => update((r, n) => ops.setSubtaskDone(r, project.id, task.id, subtask.id, !subtask.done, n))}
              >
                {subtask.done ? 'Reopen' : 'Mark done'}
              </button>
            )}
            {!task && (
              <button type="button" class="btn small" onClick={() => void setProjectDone(project, !item.done)}>
                {item.done ? 'Reopen project' : 'Mark project done'}
              </button>
            )}
            <button
              type="button"
              class="btn quiet small"
              onClick={() => {
                set({ day: null });
                openProject(project.id, task?.id ?? null);
              }}
            >
              Open in project →
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
