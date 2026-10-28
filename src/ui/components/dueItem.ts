import type { DueItem } from '../../core/calendar';
import { plural } from '../../core/format';
import type { CalendarEntry } from '../../core/schema';

/** A project's, a task's or a sub-task's deadline: the calendar items that belong to a project. */
export type Deadline = Extract<DueItem, { kind: 'deadline' }>;
/** An event on a day. */
export type EventDue = Extract<DueItem, { kind: 'event' }>;

export const panelDay = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
const spanDay = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short' });

export const parseDay = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y!, m! - 1, d!);
};

export function itemKey(it: DueItem): string {
  if (it.kind === 'event') return `event-${it.entry.id}`;
  return it.subtask?.id ?? it.task?.id ?? `project-${it.project.id}`;
}

/**
 * Done items recede; urgent tasks fill with the primary colour; other
 * approaching or overdue items take the highlight; the rest sit on a chip.
 */
export function itemTone(it: DueItem): 'done' | 'urgent' | 'watch' | 'open' {
  if (it.done) return 'done';
  if (it.urgent) return 'urgent';
  return it.watch ? 'watch' : 'open';
}

export function where(it: DueItem): string {
  if (it.kind === 'event') return it.entry.time ? `${it.entry.time} · Event, no project` : 'Event, no project';
  if (it.subtask && it.task) return `${it.task.title} · ${it.project.name}`;
  if (it.task) return it.project.name;
  return 'Project deadline';
}

/** "2 deadlines, 1 event · Leave": what is on a day, its days off last; "Nothing" for an empty day. */
export function dayCount(items: DueItem[], off: CalendarEntry[] = []): string {
  const events = items.filter((it) => it.kind === 'event').length;
  const deadlines = items.length - events;
  const what = [deadlines ? plural(deadlines, 'deadline') : '', events ? plural(events, 'event') : ''].filter(Boolean).join(', ');
  return [what, ...off.map((e) => e.title)].filter(Boolean).join(' · ') || 'Nothing';
}

/** "Thu 22 Oct", or "Thu 22 – Fri 23 Oct" for an entry over several days. */
export function entrySpan(e: CalendarEntry): string {
  return e.until ? spanDay.formatRange(parseDay(e.date), parseDay(e.until)) : spanDay.format(parseDay(e.date));
}

export const ENTRY_NOUN: Record<CalendarEntry['kind'], string> = { event: 'Event', leave: 'Leave', holiday: 'Holiday' };
