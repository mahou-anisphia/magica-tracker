import { costCenterLabel, type CostCenterCharge } from '../../../core/costCenters';
import { plural } from '../../../core/format';
import type { MonthBalance } from '../../../core/workdays';

/** One shade per cost center, in the order given; they repeat past three. Charged to none is grey. */
export const CHARGE_TONE = ['bg-charge-1', 'bg-charge-2', 'bg-charge-3'];
export const chargeTone = (c: CostCenterCharge, i: number) => (c.costCenter ? CHARGE_TONE[i % CHARGE_TONE.length]! : 'bg-line-strong');

/** What a run of blocks, and its card, stand for: a cost center (its id), the days charged to none, or the days off. */
export const chargeKey = (c: CostCenterCharge) => c.costCenter?.id ?? 'none';
export const OFF_KEY = 'off';

/**
 * The month as one block per working day: days given to projects first, then
 * days off, then what is still to go. Which day went where doesn't matter, so
 * the blocks are counted, not dated. Days past the month's working days
 * (over) take the highlight. `open`, the projects' blocks group by cost
 * center, a shade each, and over days keep their shade with a highlight
 * ring, and each run is labelled with its days and cost center. Each run of
 * blocks is a button (`onPick`) for its cost center (or the days off); the
 * `picked` one sits in a tinted box with the accent's outline.
 */
export function MonthBar(props: {
  balance: MonthBalance;
  charges: CostCenterCharge[];
  open: boolean;
  picked: string | null;
  /** Without it (nothing to open), the runs are plain blocks. */
  onPick?: (key: string) => void;
}) {
  const { onPick } = props;
  const { target, filled, leave, holiday } = props.balance;
  const runs = [
    ...props.charges.map((c, i) => ({
      key: chargeKey(c),
      label: c.costCenter ? costCenterLabel(c.costCenter) : 'No cost center',
      short: c.costCenter ? (c.costCenter.name ?? c.costCenter.code!) : 'None',
      days: c.days,
      tone: props.open ? chargeTone(c, i) : 'bg-primary-strong',
    })),
    ...(leave + holiday ? [{ key: OFF_KEY, label: 'Leave and holidays', short: 'Off', days: leave + holiday, tone: 'bg-card bg-off-mark' }] : []),
  ];
  let n = 0;
  /** A block's look: its run's tone and, past the month's working days, the highlight. */
  const block = (tone: string, off: boolean) => {
    const over = n++ >= target;
    if (!over) return `${tone} ${off ? 'inset-ring inset-ring-line' : ''}`;
    return props.open || off ? `${tone} inset-ring-2 inset-ring-watch-mark` : 'bg-watch inset-ring inset-ring-watch-mark';
  };
  const free = Math.max(0, target - filled);
  // Open, runs stand apart with room for their labels and the picked one's box.
  const open = props.open;
  const run = open
    ? '-m-4 grid min-w-0 content-start gap-6 rounded-8 p-4 text-left'
    : '-my-3 flex min-w-0 gap-3 rounded-7 py-3';
  const pickable =
    'cursor-pointer hover:not-aria-pressed:bg-page-70 aria-pressed:bg-primary-tint-45 aria-pressed:shadow-[inset_0_0_0_1.5px_var(--color-accent)] focus-visible:-outline-offset-1';

  return (
    <div class={`flex ${open ? 'gap-10' : 'gap-3'}`} role="group" aria-label={`${filled} of ${target} working days accounted for`}>
      {runs.map((r) => {
        const blocks = Array.from({ length: r.days }, () => block(r.tone, r.key === OFF_KEY));
        const inner = (
          <>
            <span class="flex w-full min-w-0 gap-3">
              {blocks.map((cls, i) => (
                <span key={i} class={`h-14 min-w-0 flex-1 rounded-4 ${cls}`} />
              ))}
            </span>
            {open && (
              <span class="truncate text-12 text-body">
                <strong class="font-semibold text-ink tabular-nums">{r.days}</strong> {r.short}
              </span>
            )}
          </>
        );
        const flex = { flex: `${r.days} 1 0` };
        if (!onPick) {
          return (
            <span key={r.key} class={run} style={flex}>
              {inner}
            </span>
          );
        }
        return (
          <button
            key={r.key}
            type="button"
            class={`${run} ${pickable}`}
            style={flex}
            aria-label={`${r.label}: ${plural(r.days, 'day')}`}
            aria-pressed={props.picked === r.key}
            onClick={() => onPick(r.key)}
          >
            {inner}
          </button>
        );
      })}
      {free > 0 && (
        <span class="flex min-w-0 gap-3 self-start" style={{ flex: `${free} 1 0` }} aria-hidden="true">
          {Array.from({ length: free }, (_, i) => (
            <span key={i} class="h-14 min-w-0 flex-1 rounded-4 bg-chip-70" />
          ))}
        </span>
      )}
    </div>
  );
}
