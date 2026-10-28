import { daysUntil, DUE_SOON_DAYS } from './due';
import { dayNumber, stampOf, type PeriodRange } from './period';
import { workdaySettings, type CalendarEntry, type Project, type Root, type WorkdaySettings } from './schema';
import { localDateStamp } from './time';

/**
 * Working days, days off and the finance timesheet. Each calendar month's
 * working days (the worked weekdays, from the day tracking started) must be
 * accounted for: given to projects in whole days, or taken as leave or a
 * holiday. Which day went where doesn't matter, only that the month adds up.
 * Days off also lower a period's capacity for allocation; nothing else of
 * the timesheet touches allocation.
 */

const MONDAY = dayNumber('2024-01-01');

/** 1 for Monday … 7 for Sunday, as in the settings. */
export function isoWeekday(day: string): number {
  return ((((dayNumber(day) - MONDAY) % 7) + 7) % 7) + 1;
}

/** The month a day falls in: "2026-10-28" → "2026-10". */
export const monthOf = (day: string) => day.slice(0, 7);

/** The month `delta` months from `month`. */
export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y!, m! - 1 + delta, 1)).toISOString().slice(0, 7);
}

export function daysOfMonth(month: string): string[] {
  const [y, m] = month.split('-').map(Number);
  const first = dayNumber(`${month}-01`);
  const count = new Date(Date.UTC(y!, m!, 0)).getUTCDate();
  return Array.from({ length: count }, (_, i) => stampOf(first + i));
}

/** Every day an entry covers, from its date to its last day (a year at most). */
export function entryDays(e: CalendarEntry): string[] {
  const start = dayNumber(e.date);
  const end = e.until ? Math.min(Math.max(dayNumber(e.until), start), start + 365) : start;
  return Array.from({ length: end - start + 1 }, (_, i) => stampOf(start + i));
}

/** Days off on the calendar, by day. A holiday wins over leave on the same day. */
export function daysOff(root: Root): Map<string, CalendarEntry> {
  const out = new Map<string, CalendarEntry>();
  for (const e of root.calendar ?? []) {
    if (e.kind === 'event') continue;
    for (const day of entryDays(e)) if (e.kind === 'holiday' || !out.has(day)) out.set(day, e);
  }
  return out;
}

/** The leave and holidays on one day: usually none, or one. */
export function daysOffOn(root: Root, day: string): CalendarEntry[] {
  return (root.calendar ?? []).filter((e) => e.kind !== 'event' && day >= e.date && day <= (e.until ?? e.date));
}

const isWorked = (s: WorkdaySettings, day: string) => s.weekdays.includes(isoWeekday(day));

/** Worked weekdays from `start` to `end`, inclusive: what a stretch of leave takes off. */
export function workingDaysIn(root: Root, start: string, end: string = start): number {
  const s = workdaySettings(root);
  let n = 0;
  for (let d = dayNumber(start); d <= dayNumber(end); d++) if (isWorked(s, stampOf(d))) n++;
  return n;
}

/** Whether a timesheet is kept: once the day it starts from is set. */
export const isTracking = (root: Root) => !!workdaySettings(root).from;

/** Days given to a project in one month, or in all of them. */
export function timesheetDays(project: Project, month?: string): number {
  return (project.timesheet ?? []).reduce((n, t) => (month === undefined || t.month === month ? n + t.days : n), 0);
}

export type MonthBalance = {
  month: string;
  /** Worked weekdays in the month, from the day tracking started. */
  target: number;
  /** Projects given days this month, in project order. */
  projects: { project: Project; days: number }[];
  given: number;
  /** Worked weekdays taken as leave, and as holidays. */
  leave: number;
  holiday: number;
  /** The leave and holidays behind them, with the working days each takes this month, in date order. */
  off: { entry: CalendarEntry; days: number }[];
  /** Given plus days off. */
  filled: number;
  /** Filled minus target: below zero short, above it over. */
  diff: number;
  /** The month's last working day, when it has one. */
  lastDay?: string;
};

/** How one month's timesheet stands. A day off on a weekend isn't a working day, so it doesn't count. */
export function monthBalance(root: Root, month: string): MonthBalance {
  const s = workdaySettings(root);
  const off = daysOff(root);
  let target = 0;
  let leave = 0;
  let holiday = 0;
  let lastDay: string | undefined;
  const taken = new Map<CalendarEntry, number>();
  for (const day of daysOfMonth(month)) {
    if (!isWorked(s, day) || (s.from && day < s.from)) continue;
    target++;
    lastDay = day;
    const e = off.get(day);
    if (!e) continue;
    if (e.kind === 'holiday') holiday++;
    else leave++;
    taken.set(e, (taken.get(e) ?? 0) + 1);
  }
  const projects = root.projects.flatMap((project) => {
    const days = timesheetDays(project, month);
    return days ? [{ project, days }] : [];
  });
  const given = projects.reduce((n, p) => n + p.days, 0);
  const filled = given + leave + holiday;
  return {
    month,
    target,
    projects,
    given,
    leave,
    holiday,
    off: [...taken].map(([entry, days]) => ({ entry, days })),
    filled,
    diff: filled - target,
    ...(lastDay ? { lastDay } : {}),
  };
}

/**
 * Months to flag, oldest first: every past month since tracking started that
 * doesn't add up, and this month once it is over, or still short with its
 * last working day DUE_SOON_DAYS away or closer.
 */
export function timesheetFlags(root: Root, now: Date): MonthBalance[] {
  const { from } = workdaySettings(root);
  if (!from) return [];
  const current = monthOf(localDateStamp(now));
  const out: MonthBalance[] = [];
  for (let m = monthOf(from); m <= current; m = shiftMonth(m, 1)) {
    const b = monthBalance(root, m);
    if (b.diff === 0) continue;
    if (m < current || b.diff > 0 || (b.lastDay !== undefined && daysUntil(b.lastDay, now) <= DUE_SOON_DAYS)) out.push(b);
  }
  return out;
}

/**
 * "3 days short", "1 day over", or "Balanced". With `now`, a month not over
 * yet that is short reads "2 days to go" instead.
 */
export function balanceLabel(diff: number, month?: string, now?: Date): string {
  if (diff === 0) return 'Balanced';
  const n = Math.abs(diff);
  const days = `${n} ${n === 1 ? 'day' : 'days'}`;
  if (diff < 0 && month && now && month >= monthOf(localDateStamp(now))) return `${days} to go`;
  return `${days} ${diff < 0 ? 'short' : 'over'}`;
}

/**
 * How much of a full period is left once days off are taken out, in percent
 * (to a hundredth): 100 with none, 80 for two days off in a ten-day
 * fortnight. Counts worked weekdays only, whether or not a timesheet is kept.
 */
export function capacityIn(root: Root, range: PeriodRange): { capacity: number; daysOff: number } {
  const s = workdaySettings(root);
  const off = daysOff(root);
  let worked = 0;
  let away = 0;
  for (let n = dayNumber(range.start); n <= dayNumber(range.end); n++) {
    const day = stampOf(n);
    if (!isWorked(s, day)) continue;
    worked++;
    if (off.has(day)) away++;
  }
  return { capacity: worked ? Math.round(((worked - away) / worked) * 10000) / 100 : 100, daysOff: away };
}
