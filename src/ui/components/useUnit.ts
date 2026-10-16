import { allocationSettings, type AllocationPeriod, type AllocationUnit } from '../../core/schema';
import { formatLoad } from '../../core/units';
import { useStore } from '../store';

/**
 * Percent or hours, as set in Settings. It is how you read allocation, so it
 * applies to everyone's you see, your team's too (each by their own period).
 */
export function useUnit(): AllocationUnit {
  return allocationSettings(useStore().root).unit;
}

/**
 * Formats an allocation ("35%" or "28h") in your unit. A task's allocation is
 * a share of its owner's period: yours unless `period` says otherwise.
 */
export function useLoadFormat(period?: AllocationPeriod): (percent: number) => string {
  const own = allocationSettings(useStore().root);
  return (percent) => formatLoad(percent, period ?? own.period, own.unit);
}
