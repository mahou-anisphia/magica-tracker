import { periodLength } from './period';
import type { AllocationPeriod, AllocationUnit } from './schema';

/**
 * Allocation is stored in percent of a period's capacity. Shown in hours,
 * 100% is HOURS_PER_WEEK a week, so 80 hours a fortnight; anything past it is
 * past 100%, as in percent.
 */
export const HOURS_PER_WEEK = 40;

/** Hours in 100% of a period: 40 a week, 80 a fortnight. */
export function periodHours(period: AllocationPeriod): number {
  return (HOURS_PER_WEEK * periodLength(period)) / 7;
}

export function toHours(percent: number, period: AllocationPeriod): number {
  return (percent * periodHours(period)) / 100;
}

/** Hours as the percent that is stored, kept to a thousandth so it reads back as the same hours. */
export function fromHours(hours: number, period: AllocationPeriod): number {
  return Math.round(((hours / periodHours(period)) * 100) * 1000) / 1000;
}

/** An amount in the chosen unit, as a number and its suffix: 12.5 and "%", or 10 and "h" (to the half hour). */
export function loadParts(percent: number, period: AllocationPeriod, unit: AllocationUnit): { value: number; unit: string } {
  if (unit === 'hours') return { value: Math.round(toHours(percent, period) * 2) / 2, unit: 'h' };
  return { value: Math.round(percent * 10) / 10, unit: '%' };
}

/** "105%" or "84h". */
export function formatLoad(percent: number, period: AllocationPeriod, unit: AllocationUnit): string {
  const p = loadParts(percent, period, unit);
  return `${p.value}${p.unit}`;
}
