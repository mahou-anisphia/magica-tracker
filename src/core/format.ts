import { daysSince } from './time';

/** "today", "yesterday", "3 days ago", "2 weeks ago", "4 months ago". */
export function relativeDays(iso: string, now: Date): string {
  const d = daysSince(iso, now);
  if (d === 0) return 'today';
  if (d === 1) return 'yesterday';
  if (d < 14) return `${d} days ago`;
  if (d < 60) return `${Math.floor(d / 7)} weeks ago`;
  if (d < 730) return `${Math.floor(d / 30)} months ago`;
  return `${Math.floor(d / 365)} years ago`;
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** Overview's heading: "Sunday, 4 Oct". */
export function dayHeading(d: Date, locale?: string): string {
  const weekday = new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(d);
  const month = new Intl.DateTimeFormat(locale, { month: 'short' }).format(d);
  return `${weekday}, ${d.getDate()} ${month}`;
}

/** Timeline's heading: "October, 2026". */
export function monthHeading(d: Date, locale?: string): string {
  const month = new Intl.DateTimeFormat(locale, { month: 'long' }).format(d);
  return `${month}, ${d.getFullYear()}`;
}
