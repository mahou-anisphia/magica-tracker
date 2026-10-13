import * as ops from '../../../core/ops';
import { allocationSettings, type AllocationPeriod, type Root } from '../../../core/schema';
import { update } from '../../store';
import { Segmented } from '../../components/Segmented';
import { Panel } from '../../components/Panel';

/** 100% to 300%, in steps of 10. */
const LIMITS = Array.from({ length: 21 }, (_, i) => 100 + i * 10);

const PERIODS: { value: AllocationPeriod; label: string }[] = [
  { value: 'week', label: 'Weekly' },
  { value: 'fortnight', label: 'Fortnightly' },
];

/** The allocation period and the most you can carry. Saved with your data, so your team sees them. */
export function AllocationCard(props: { root: Root }) {
  const a = allocationSettings(props.root);
  return (
    <Panel
      id="allocation-h"
      title="Allocation"
      highlight="settings-alloc"
      note="A task counts in the period its deadline falls in. A start date spreads it over the periods it covers."
    >
      <div class="flex flex-wrap items-center justify-between gap-12">
        <span class="font-medium text-ink">Period</span>
        <Segmented
          label="Allocation period"
          value={a.period}
          options={PERIODS}
          onChange={(period) => update((r, n) => ops.setAllocationSettings(r, { period }, n))}
        />
      </div>
      <div class="flex flex-wrap items-center justify-between gap-12">
        <label for="max-load" class="font-medium text-ink">
          The most I can carry
        </label>
        <select
          id="max-load"
          class="min-h-30 rounded-8 border border-line bg-card px-10 py-2 text-14 text-ink tabular-nums max-lg:min-h-44 max-lg:text-16"
          value={a.maxLoad}
          onChange={(e) => {
            const maxLoad = Number(e.currentTarget.value);
            update((r, n) => ops.setAllocationSettings(r, { maxLoad }, n));
          }}
        >
          {LIMITS.map((v) => (
            <option key={v} value={v}>
              {v}%
            </option>
          ))}
        </select>
      </div>
      <p class="text-12 text-body">
        100% is a full {a.period}. Past 100% the bar turns to the highlight colour; past {a.maxLoad}% your team sees “past
        limit”.
      </p>
    </Panel>
  );
}
