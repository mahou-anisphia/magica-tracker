import { plural } from '../../core/format';
import type { PeriodRange } from '../../core/period';
import type { Allocation } from '../../core/progress';

const dayMonth = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' });
const asDate = (stamp: string) => {
  const [y, m, d] = stamp.split('-').map(Number);
  return new Date(y!, m! - 1, d!);
};

/** "5–18 Oct" (or "Oct 5 – 18"), in the reader's own date style. */
export function rangeLabel(r: PeriodRange): string {
  return dayMonth.formatRange(asDate(r.start), asDate(r.end));
}

/**
 * How much of you is spoken for this week or fortnight: every task's share
 * of the period, done ones included, on a scale up to the person's own limit. Up to 100%
 * fills in the primary colour; overload past 100% in the theme's highlight.
 * A tick marks 100%. With `whose`, it is someone else's, by their own settings.
 */
export function AllocationBar(props: { allocation: Allocation; embedded?: boolean; whose?: string }) {
  const { total, tasks, done, maxLoad, period, range } = props.allocation;
  const pct = (n: number) => `${(Math.min(Math.max(n, 0), maxLoad) / maxLoad) * 100}%`;
  const over = total > 100;
  const pastLimit = total > maxLoad;
  // "100%" sits under its tick, unless the limit's own label is too close to it.
  const mid = maxLoad <= 110 ? 'hidden' : maxLoad < 140 ? 'max-md:hidden' : '';
  const note = pastLimit ? `past the ${maxLoad}% limit` : over ? `${total - 100}% over` : `${100 - total}% free`;

  return (
    <section
      class={`grid grid-cols-1 gap-10 ${
        props.embedded
          ? 'border-t border-line bg-page-40 px-26 pt-18 pb-16 max-md:px-18 max-md:pt-16 max-md:pb-14'
          : 'rounded-14 border border-line bg-card px-24 pt-20 pb-16 shadow-card'
      }`}
      aria-labelledby="allocation-h"
    >
      <div class="flex flex-wrap items-baseline gap-x-12 gap-y-4">
        <h2 id="allocation-h" class="mr-auto text-13 font-medium text-body">
          Allocation · this {period}, {rangeLabel(range)}
          {props.whose && ' · their settings'}
        </h2>
        <span class={`text-22 font-medium tracking-[-0.02em] tabular-nums ${over ? 'text-watch-ink' : 'text-ink'}`}>
          {total}%
        </span>
        <span
          class={`text-13 whitespace-nowrap ${over ? 'rounded-full bg-watch-tint px-10 py-1 font-medium text-watch-ink' : 'text-body'}`}
        >
          {note} · {plural(tasks, 'task')}
          {done > 0 && `, ${done} done`}
        </span>
      </div>
      <div
        class="relative h-12 overflow-hidden rounded-full bg-chip-70"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={maxLoad}
        aria-valuenow={Math.min(total, maxLoad)}
        aria-valuetext={`${total}% of ${props.whose ? `${props.whose}’s` : 'your'} capacity this ${period}, ${note}`}
        aria-labelledby="allocation-h"
      >
        <span class="absolute inset-y-0 left-0 bg-primary-strong" style={{ width: pct(Math.min(total, 100)) }} />
        {over && <span class="absolute inset-y-0 bg-watch" style={{ left: pct(100), width: pct(total - 100) }} />}
        <span class="absolute -top-2 -bottom-2 -ml-1 w-2 bg-card" style={{ left: pct(100) }} aria-hidden="true" />
      </div>
      <div class="relative h-18 text-12 text-body tabular-nums" aria-hidden="true">
        <span class="absolute left-0">0%</span>
        <span class={`absolute -translate-x-1/2 ${mid}`} style={{ left: pct(100) }}>
          100%
        </span>
        <span class="absolute right-0">{maxLoad}% limit</span>
      </div>
    </section>
  );
}
