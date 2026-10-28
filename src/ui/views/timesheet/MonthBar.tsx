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
 * ring. Each run of blocks is a button (`onPick`) for its cost center (or
 * the days off); while one is `picked` it stays bright and the rest fade.
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
      days: c.days,
      tone: props.open ? chargeTone(c, i) : 'bg-primary-strong',
    })),
    ...(leave + holiday ? [{ key: OFF_KEY, label: 'Leave and holidays', days: leave + holiday, tone: 'bg-card bg-off-mark' }] : []),
  ];
  let n = 0;
  /** A block's look: its run's tone and, past the month's working days, the highlight. */
  const block = (tone: string, off: boolean) => {
    const over = n++ >= target;
    if (!over) return `${tone} ${off ? 'inset-ring inset-ring-line' : ''}`;
    return props.open || off ? `${tone} inset-ring-2 inset-ring-watch-mark` : 'bg-watch inset-ring inset-ring-watch-mark';
  };
  const free = Math.max(0, target - filled);
  const dim = props.picked !== null;

  return (
    <div class="flex gap-3" role="group" aria-label={`${filled} of ${target} working days accounted for`}>
      {runs.map((r) => {
        const blocks = Array.from({ length: r.days }, () => block(r.tone, r.key === OFF_KEY));
        const spans = blocks.map((cls, i) => <span key={i} class={`h-14 min-w-0 flex-1 rounded-4 ${cls}`} />);
        if (!onPick) {
          return (
            <span key={r.key} class="flex min-w-0 gap-3" style={{ flex: `${r.days} 1 0` }}>
              {spans}
            </span>
          );
        }
        return (
          <button
            key={r.key}
            type="button"
            class={`-my-3 flex min-w-0 cursor-pointer gap-3 rounded-7 py-3 transition-opacity focus-visible:-outline-offset-1 ${dim && props.picked !== r.key ? 'opacity-35 hover:opacity-70' : ''}`}
            style={{ flex: `${r.days} 1 0` }}
            aria-label={`${r.label}: ${plural(r.days, 'day')}`}
            aria-pressed={props.picked === r.key}
            onClick={() => onPick(r.key)}
          >
            {spans}
          </button>
        );
      })}
      {Array.from({ length: free }, (_, i) => (
        <span key={`free-${i}`} class={`h-14 min-w-0 flex-1 rounded-4 bg-chip-70 ${dim ? 'opacity-35' : ''}`} aria-hidden="true" />
      ))}
    </div>
  );
}
