import { allocationSettings } from '../../core/schema';
import { fromHours, periodHours, toHours } from '../../core/units';
import { useStore } from '../store';

/**
 * Allocation in your unit: a percent of your capacity, or hours (100% is 40
 * hours a week). Stored as a percent either way; empty clears it. Saved on
 * change.
 */
export function EffortInput(props: {
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  /** Leave out the visible "Allocation" (a form that labels its rows itself); `id` ties that label to the field. */
  bare?: boolean;
  id?: string;
}) {
  const { unit, period } = allocationSettings(useStore().root);
  const hours = unit === 'hours';
  const max = hours ? periodHours(period) : 100;
  const shown = props.value === undefined ? '' : hours ? Math.round(toHours(props.value, period) * 2) / 2 : Math.round(props.value * 10) / 10;
  return (
    <label class="inline-flex items-center gap-8 text-13 font-medium text-body" title={hours ? `Hours this ${period}; ${max}h is 100%` : undefined}>
      {!props.bare && 'Allocation'}
      <span class="inline-flex items-center gap-4">
        <input
          id={props.id}
          type="number"
          class="min-h-30 w-[4.5em] rounded-8 border border-line bg-card px-10 py-2 text-right text-14 text-ink tabular-nums max-lg:min-h-44 max-lg:text-16"
          inputMode="decimal"
          min={0}
          max={max}
          step={hours ? 0.5 : 5}
          placeholder="—"
          value={shown}
          onChange={(e) => {
            const raw = e.currentTarget.value.trim();
            if (raw === '') return props.onChange(undefined);
            const n = Number(raw);
            if (!Number.isFinite(n)) return;
            const clamped = Math.min(max, Math.max(0, n));
            props.onChange(hours ? fromHours(Math.round(clamped * 2) / 2, period) : Math.round(clamped));
          }}
        />
        {hours ? 'h' : '%'}
      </span>
    </label>
  );
}
