import type { CostCenterCharge } from '../../../core/costCenters';
import type { MonthBalance } from '../../../core/workdays';

/** One shade per cost center, in the order given; they repeat past three. Charged to none is grey. */
export const CHARGE_TONE = ['bg-charge-1', 'bg-charge-2', 'bg-charge-3'];
export const chargeTone = (c: CostCenterCharge, i: number) => (c.costCenter ? CHARGE_TONE[i % CHARGE_TONE.length]! : 'bg-line-strong');

/**
 * The month as one block per working day: days given to projects first, then
 * days off, then what is still to go. Which day went where doesn't matter, so
 * the blocks are counted, not dated. Days past the month's working days
 * (over) take the highlight. With `charges` (opened), the projects' blocks
 * group by cost center, a shade each, and over days keep their shade with a
 * highlight ring.
 */
export function MonthBar(props: { balance: MonthBalance; charges?: CostCenterCharge[] }) {
  const { target, given, filled } = props.balance;
  const tones = props.charges?.flatMap((c, i) => Array.from({ length: c.days }, () => chargeTone(c, i)));
  const blocks = Array.from({ length: Math.max(target, filled) }, (_, i) => {
    const over = i >= target;
    if (i < given) {
      if (tones) return `${tones[i] ?? 'bg-primary-strong'} ${over ? 'inset-ring-2 inset-ring-watch-mark' : ''}`;
      return over ? 'bg-watch inset-ring inset-ring-watch-mark' : 'bg-primary-strong';
    }
    if (i < filled) return `bg-card bg-off-mark ${over ? 'inset-ring-2 inset-ring-watch-mark' : 'inset-ring inset-ring-line'}`;
    return 'bg-chip-70';
  });
  return (
    <div class="flex gap-3" role="img" aria-label={`${filled} of ${target} working days accounted for`}>
      {blocks.map((cls, i) => (
        <span key={i} class={`h-14 min-w-0 flex-1 rounded-4 ${cls}`} />
      ))}
    </div>
  );
}
