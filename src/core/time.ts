export const DAY_MS = 24 * 60 * 60 * 1000;

export function nowIso(): string {
  return new Date().toISOString();
}

/** Whole 24-hour periods between `iso` and `now`. Never negative. */
export function daysSince(iso: string, now: Date): number {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return 0;
  return Math.max(0, Math.floor((now.getTime() - then) / DAY_MS));
}

/** True when `a` is strictly later than `b`. Unparseable dates count as oldest. */
export function isNewer(a: string | undefined, b: string | undefined): boolean {
  const ta = a ? Date.parse(a) : NaN;
  const tb = b ? Date.parse(b) : NaN;
  if (Number.isNaN(ta)) return false;
  if (Number.isNaN(tb)) return true;
  return ta > tb;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Local calendar date, e.g. 2026-09-28. */
export function localDateStamp(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Local date and time safe for filenames, e.g. 2026-09-28-093012. */
export function localTimeStamp(d: Date): string {
  return `${localDateStamp(d)}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}
