import { plural } from '../../core/format';
import { ALLOCATION_SCALE, type Allocation } from '../../core/progress';
import type { Priority } from '../../core/schema';

export const PRIORITY_LABEL: Record<Priority, string> = { urgent: 'Urgent', high: 'High', medium: 'Medium', low: 'Low' };

export function PriorityChip(props: { priority: Priority | undefined }) {
  if (!props.priority) return null;
  return <span class={`pill prio-${props.priority}`}>{PRIORITY_LABEL[props.priority]}</span>;
}

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
      class={`allocation ${over ? 'over' : ''} ${props.embedded ? 'embedded' : ''}`}
      aria-labelledby="allocation-h"
    >
      <div class="alloc-head">
        <h2 id="allocation-h" class="stat-label">
          Allocation
        </h2>
        <span class="alloc-value">{total}%</span>
        <span class="alloc-note">
          {note} · {plural(tasks, 'task')}
        </span>
      </div>
      <div
        class="alloc-track"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={ALLOCATION_SCALE}
        aria-valuenow={Math.min(total, ALLOCATION_SCALE)}
        aria-valuetext={`${total}% of your capacity allocated, ${note}`}
        aria-labelledby="allocation-h"
      >
        <span class="alloc-fill" style={{ width: pct(Math.min(total, 100)) }} />
        {over && <span class="alloc-over" style={{ left: pct(100), width: pct(total - 100) }} />}
        <span class="alloc-tick" style={{ left: pct(100) }} aria-hidden="true" />
      </div>
      <div class="alloc-scale" aria-hidden="true">
        <span>0%</span>
        <span>100%</span>
        <span>200%</span>
      </div>
    </section>
  );
}
