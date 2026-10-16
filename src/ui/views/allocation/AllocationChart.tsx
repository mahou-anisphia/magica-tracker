import { calendarDay } from '../../../core/format';
import type { Allocation } from '../../../core/progress';
import { rangeLabel } from '../../components/AllocationBar';

/** The chart's height in px; the bars are measured in it. */
const H = 200;

/**
 * One column per period, oldest on the left and this one ("Now") on the
 * right, against lines at 100% and the person's limit. Up to 100% is the
 * primary colour, overload above it the highlight, as on the allocation bar.
 * Each column is a button that picks its period.
 */
export function AllocationChart(props: { history: Allocation[]; picked: string; onPick: (start: string) => void }) {
  const { history } = props;
  const { maxLoad, period } = history.at(-1)!;
  // Headroom above the tallest column and the limit, for the value over each bar.
  const top = Math.ceil((Math.max(maxLoad, ...history.map((a) => a.total)) * 1.15) / 25) * 25;
  const px = (n: number) => `${(Math.min(Math.max(n, 0), top) / top) * H}px`;
  const columns = { gridTemplateColumns: `repeat(${history.length}, minmax(0, 1fr))` };
  const last = history.length - 1;

  return (
    <div class="grid grid-cols-[40px_minmax(0,1fr)] gap-10">
      <div class="relative h-200 text-12 text-body tabular-nums" aria-hidden="true">
        {[...new Set([0, 100, maxLoad])].map((n) => (
          <span key={n} class="absolute right-0 translate-y-1/2" style={{ bottom: px(n) }}>
            {n}%
          </span>
        ))}
      </div>
      <div class="grid grid-cols-1 gap-8">
        <div class="relative h-200 border-b border-line">
          <span class="absolute inset-x-0 border-t border-line" style={{ bottom: px(100) }} aria-hidden="true" />
          <span class="absolute inset-x-0 border-t-2 border-dashed border-watch-mark" style={{ bottom: px(maxLoad) }} aria-hidden="true" />
          <div class="absolute inset-0 grid items-end gap-10 max-md:gap-4" style={columns} role="group" aria-label={`Allocation by ${period}`}>
            {history.map((a, i) => {
              const over = a.total > 100;
              return (
                <button
                  key={a.range.start}
                  type="button"
                  class="flex h-full cursor-pointer flex-col items-center justify-end gap-6 rounded-t-10 focus-visible:-outline-offset-2 hover:not-aria-pressed:bg-page-70 aria-pressed:bg-primary-tint-45 aria-pressed:shadow-[inset_0_0_0_1.5px_var(--color-accent)]"
                  aria-pressed={a.range.start === props.picked}
                  aria-label={`${i === last ? `This ${period}` : rangeLabel(a.range)}: ${a.total}%${a.total > maxLoad ? ', past the limit' : ''}`}
                  onClick={() => props.onPick(a.range.start)}
                >
                  <span class={`text-12 font-medium tabular-nums max-md:hidden ${over ? 'text-watch-ink' : 'text-body'}`}>{a.total}%</span>
                  <span class="flex w-full max-w-46 flex-col px-6 max-md:px-0" aria-hidden="true">
                    {over && <span class="rounded-t-7 bg-watch" style={{ height: px(a.total - 100) }} />}
                    <span class={`bg-primary-strong ${over ? '' : 'rounded-t-7'}`} style={{ height: px(Math.min(a.total, 100)) }} />
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <div class="grid gap-10 text-center text-12 text-body tabular-nums max-md:gap-4" style={columns} aria-hidden="true">
          {history.map((a, i) => (
            <span
              key={a.range.start}
              class={`truncate ${a.range.start === props.picked ? 'font-semibold text-primary-ink' : ''} ${i % 2 && i !== last ? 'max-md:invisible' : ''}`}
            >
              {i === last ? 'Now' : calendarDay(a.range.start)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
