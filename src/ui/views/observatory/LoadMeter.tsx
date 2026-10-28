import { plural } from '../../../core/format';
import { isOver, isPastLimit, type Allocation } from '../../../core/progress';
import { useLoadFormat } from '../../components/useUnit';

/**
 * A small allocation bar for one row: up to the period's capacity (100%, or
 * less with days off) in the primary colour, past it in the highlight.
 * `label` replaces the period and limit above the bar.
 */
export function LoadMeter(props: { allocation: Allocation; name: string; label?: string }) {
  const a = props.allocation;
  const { total, limit, capacity, daysOff, period } = a;
  const fmt = useLoadFormat(period);
  const scale = Math.max(limit, total, 1);
  const pct = (n: number) => `${(Math.min(Math.max(n, 0), scale) / scale) * 100}%`;
  const past = isPastLimit(a);
  return (
    <span class="grid min-w-0 grid-cols-1 gap-6">
      <span class="flex items-baseline gap-8 text-12 text-body">
        <span class="mr-auto truncate">
          {props.label ?? `${period === 'week' ? 'Week' : 'Fortnight'} · limit ${fmt(limit)}${daysOff ? ` · ${plural(daysOff, 'day')} off` : ''}`}
        </span>
        <span class={`text-14 font-semibold whitespace-nowrap tabular-nums ${past ? 'text-watch-ink' : 'text-ink'}`}>{fmt(total)}</span>
      </span>
      <span
        class="relative h-8 overflow-hidden rounded-full bg-chip-70"
        role="meter"
        aria-label={`${props.name}: allocation${props.label ? `, ${props.label}` : ''}`}
        aria-valuemin={0}
        aria-valuemax={scale}
        aria-valuenow={total}
        aria-valuetext={`${fmt(total)}${props.label ? '' : ` this ${period}`}, limit ${fmt(limit)}`}
      >
        <span class="absolute inset-y-0 left-0 bg-primary-strong" style={{ width: pct(Math.min(total, capacity)) }} />
        {isOver(a) && <span class="absolute inset-y-0 bg-watch" style={{ left: pct(capacity), width: pct(total - capacity) }} />}
        <span class="absolute -top-2 -bottom-2 -ml-1 w-2 bg-card" style={{ left: pct(capacity) }} aria-hidden="true" />
      </span>
    </span>
  );
}
