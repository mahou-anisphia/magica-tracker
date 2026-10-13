import type { Allocation } from '../../../core/progress';

/** A small allocation bar for one row: up to 100% in the primary colour, past it in the highlight. */
export function LoadMeter(props: { allocation: Allocation; name: string }) {
  const { total, maxLoad, period } = props.allocation;
  const scale = Math.max(maxLoad, total);
  const pct = (n: number) => `${(Math.min(Math.max(n, 0), scale) / scale) * 100}%`;
  const past = total > maxLoad;
  return (
    <span class="grid min-w-0 grid-cols-1 gap-6">
      <span class="flex items-baseline gap-8 text-12 text-body">
        <span class="mr-auto truncate">
          {period === 'week' ? 'Week' : 'Fortnight'} · limit {maxLoad}%
        </span>
        <span class={`text-14 font-semibold whitespace-nowrap tabular-nums ${past ? 'text-watch-ink' : 'text-ink'}`}>{total}%</span>
      </span>
      <span
        class="relative h-8 overflow-hidden rounded-full bg-chip-70"
        role="meter"
        aria-label={`${props.name}: allocation`}
        aria-valuemin={0}
        aria-valuemax={scale}
        aria-valuenow={total}
        aria-valuetext={`${total}% this ${period}, limit ${maxLoad}%`}
      >
        <span class="absolute inset-y-0 left-0 bg-primary-strong" style={{ width: pct(Math.min(total, 100)) }} />
        {total > 100 && <span class="absolute inset-y-0 bg-watch" style={{ left: pct(100), width: pct(total - 100) }} />}
        <span class="absolute -top-2 -bottom-2 -ml-1 w-2 bg-card" style={{ left: pct(100) }} aria-hidden="true" />
      </span>
    </span>
  );
}
