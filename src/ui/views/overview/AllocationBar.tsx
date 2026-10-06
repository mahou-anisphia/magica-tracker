import { plural } from '../../../core/format';
import { ALLOCATION_SCALE, type Allocation } from '../../../core/progress';

/**
 * How much of you is spoken for, at a glance: every open task's allocation
 * added up, on a 0–200% scale. Up to 100% fills in Iris Deep; the overload
 * past 100% fills in amber. A tick marks 100%.
 */
export function AllocationBar(props: { allocation: Allocation; embedded?: boolean }) {
  const { total, tasks } = props.allocation;
  const pct = (n: number) => `${(Math.min(Math.max(n, 0), ALLOCATION_SCALE) / ALLOCATION_SCALE) * 100}%`;
  const over = total > 100;
  const note = over ? `${total - 100}% over` : `${100 - total}% free`;

  return (
    <section
      class={`grid grid-cols-1 gap-10 ${
        props.embedded
          ? 'border-t border-line bg-mist-40 px-26 pt-18 pb-16 max-md:px-18 max-md:pt-16 max-md:pb-14'
          : 'rounded-14 border border-line bg-card px-24 pt-20 pb-16 shadow-card'
      }`}
      aria-labelledby="allocation-h"
    >
      <div class="flex flex-wrap items-baseline gap-x-12 gap-y-4">
        <h2 id="allocation-h" class="mr-auto text-13 font-medium text-slate">
          Allocation
        </h2>
        <span class={`text-22 font-medium tracking-[-0.02em] tabular-nums ${over ? 'text-gold-ink' : 'text-deep'}`}>
          {total}%
        </span>
        <span
          class={`text-13 whitespace-nowrap ${over ? 'rounded-full bg-gold-tint px-10 py-1 font-medium text-gold-ink' : 'text-slate'}`}
        >
          {note} · {plural(tasks, 'task')}
        </span>
      </div>
      <div
        class="relative h-12 overflow-hidden rounded-full bg-frost-70"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={ALLOCATION_SCALE}
        aria-valuenow={Math.min(total, ALLOCATION_SCALE)}
        aria-valuetext={`${total}% of your capacity allocated, ${note}`}
        aria-labelledby="allocation-h"
      >
        <span class="absolute inset-y-0 left-0 bg-iris-deep" style={{ width: pct(Math.min(total, 100)) }} />
        {over && <span class="absolute inset-y-0 bg-gold" style={{ left: pct(100), width: pct(total - 100) }} />}
        <span class="absolute -top-2 -bottom-2 -ml-1 w-2 bg-card" style={{ left: pct(100) }} aria-hidden="true" />
      </div>
      <div class="flex justify-between text-12 text-slate tabular-nums" aria-hidden="true">
        <span>0%</span>
        <span>100%</span>
        <span>200%</span>
      </div>
    </section>
  );
}
