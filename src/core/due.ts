/**
 * Due dates are calendar days ("2026-10-03"), compared in local time, so a
 * task due today is due today wherever the page is opened.
 */

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isCalendarDate(s: string): boolean {
  const m = DATE_RE.exec(s);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(y, mo - 1, d);
  return date.getFullYear() === y && date.getMonth() === mo - 1 && date.getDate() === d;
}

function localDay(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y!, m! - 1, d!);
}

/** Calendar days from today until `due`: 0 today, 1 tomorrow, -2 two days ago. */
export function daysUntil(due: string, now: Date): number {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  // Round: a DST shift makes some local days 23 or 25 hours long.
  return Math.round((localDay(due).getTime() - today.getTime()) / 86_400_000);
}

/** A deadline this many days out (or closer) counts as approaching. Fixed. */
export const DUE_SOON_DAYS = 3;

/** Unfinished and overdue, due today, or due within DUE_SOON_DAYS: worth watching. */
export function isDueSoon(due: string | undefined, done: boolean, now: Date): boolean {
  return !!due && !done && daysUntil(due, now) <= DUE_SOON_DAYS;
}

/** "overdue 2 days", "due today", "due tomorrow", "due in 3 days". */
export function dueDistance(days: number): string {
  if (days < 0) return `overdue ${-days} ${days === -1 ? 'day' : 'days'}`;
  if (days === 0) return 'due today';
  if (days === 1) return 'due tomorrow';
  return `due in ${days} days`;
}

/** "Today", "Tomorrow", "Yesterday", "Oct 3", or "Oct 3, 2027" outside this year. */
export function dueLabel(due: string, now: Date, locale?: string): string {
  const n = daysUntil(due, now);
  if (n === 0) return 'Today';
  if (n === 1) return 'Tomorrow';
  if (n === -1) return 'Yesterday';
  const date = localDay(due);
  const sameYear = date.getFullYear() === now.getFullYear();
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  }).format(date);
}
