import type { AllocationPeriod } from './schema';
import { localDateStamp } from './time';

/**
 * Allocation periods: weeks start on Monday; fortnights are counted from a
 * fixed Monday (1 January 2024), so everyone's fortnight lines up. Days are
 * whole calendar days, counted without time zones so DST never shifts them.
 */

const EPOCH = dayNumber('2024-01-01'); // a Monday

/** A calendar day ("2026-10-03") as a whole number of days. */
export function dayNumber(stamp: string): number {
  const [y, m, d] = stamp.split('-').map(Number);
  return Math.round(Date.UTC(y!, m! - 1, d!) / 86_400_000);
}

export function stampOf(n: number): string {
  return new Date(n * 86_400_000).toISOString().slice(0, 10);
}

/** First and last day of a period, inclusive. */
export type PeriodRange = { start: string; end: string };

export function periodLength(period: AllocationPeriod): number {
  return period === 'week' ? 7 : 14;
}

/** The period that `day` (a calendar stamp) falls in. */
export function periodOf(day: string, period: AllocationPeriod): PeriodRange {
  const len = periodLength(period);
  const n = dayNumber(day);
  const start = EPOCH + Math.floor((n - EPOCH) / len) * len;
  return { start: stampOf(start), end: stampOf(start + len - 1) };
}

/** The period today falls in, in local time. */
export function currentPeriod(now: Date, period: AllocationPeriod): PeriodRange {
  return periodOf(localDateStamp(now), period);
}

/** How many days two inclusive ranges share. */
export function overlapDays(a: PeriodRange, b: PeriodRange): number {
  const from = Math.max(dayNumber(a.start), dayNumber(b.start));
  const to = Math.min(dayNumber(a.end), dayNumber(b.end));
  return Math.max(0, to - from + 1);
}
