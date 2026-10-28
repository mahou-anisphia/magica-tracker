import type { MonthBalance } from '../../../core/workdays';

/**
 * The month as one block per working day: days given to projects first, then
 * days off, then what is still to go. Days past the month's working days
 * (over) take the highlight. Which day went where doesn't matter, so the
 * blocks are counted, not dated.
 */
export function MonthBar(props: { balance: MonthBalance }) {
  const { target, given, filled } = props.balance;
  const blocks = Array.from({ length: Math.max(target, filled) }, (_, i) => {
    if (i >= target) return 'bg-watch inset-ring inset-ring-watch-mark';
    if (i < given) return 'bg-primary-strong';
    if (i < filled) return 'bg-card bg-off inset-ring inset-ring-line';
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
