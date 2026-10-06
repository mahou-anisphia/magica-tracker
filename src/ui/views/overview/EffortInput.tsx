/** Allocation as a whole percent of your capacity; empty clears it. Saved on change. */
export function EffortInput(props: { value: number | undefined; onChange: (v: number | undefined) => void }) {
  return (
    <label class="inline-flex items-center gap-8 text-13 font-medium text-slate">
      Allocation
      <span class="inline-flex items-center gap-4">
        <input
          type="number"
          class="min-h-30 w-[4.5em] rounded-8 border border-line bg-card px-10 py-2 text-right text-14 text-deep tabular-nums max-lg:min-h-44 max-lg:text-16"
          inputMode="numeric"
          min={0}
          max={100}
          step={5}
          placeholder="—"
          value={props.value ?? ''}
          onChange={(e) => {
            const raw = e.currentTarget.value.trim();
            if (raw === '') return props.onChange(undefined);
            const n = Math.round(Number(raw));
            if (Number.isFinite(n)) props.onChange(Math.min(100, Math.max(0, n)));
          }}
        />
        %
      </span>
    </label>
  );
}
