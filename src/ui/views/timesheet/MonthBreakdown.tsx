import { useEffect, useRef } from 'preact/hooks';
import { costCenterLabel, type CostCenterCharge } from '../../../core/costCenters';
import { plural } from '../../../core/format';
import { balanceLabel, type MonthBalance } from '../../../core/workdays';
import { entrySpan } from '../../components/dueItem';
import { chargeKey, chargeTone, OFF_KEY } from './MonthBar';

// Cards share the row and keep 220px each; more than fit scroll sideways (a cut-off card hints at it).
const SLOT = 'flex flex-[1_0_220px] snap-start';
const CARD =
  'grid w-full cursor-pointer content-start gap-8 rounded-12 border border-line bg-card px-14 py-12 text-left hover:border-accent aria-pressed:outline-2 aria-pressed:outline-offset-1 aria-pressed:outline-accent';

/**
 * The month bar opened: a card per cost center with its shade, its days and
 * the projects behind them, then the leave and holidays, which are never
 * charged, in one row that scrolls sideways when they don't fit. A card is
 * picked from it or from its run of blocks in the bar: picked, it is
 * outlined and scrolled into view. When the month is over, a line says how
 * far.
 */
export function MonthBreakdown(props: {
  id: string;
  balance: MonthBalance;
  charges: CostCenterCharge[];
  now: Date;
  picked: string | null;
  onPick: (key: string) => void;
}) {
  const { balance: b, charges, picked } = props;
  const off = b.leave + b.holiday;
  const row = useRef<HTMLUListElement>(null);
  useEffect(() => {
    if (picked) row.current?.querySelector(`[data-charge="${CSS.escape(picked)}"]`)?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
  }, [picked]);
  const card = (key: string) => ({
    type: 'button' as const,
    'data-charge': key,
    class: CARD,
    'aria-pressed': picked === key,
    onClick: () => props.onPick(key),
  });
  return (
    <div id={props.id} class="grid grid-cols-1 gap-12 pt-4">
      <ul ref={row} class="-mx-4 flex snap-x gap-12 overflow-x-auto px-4 pt-3 pb-6" aria-label="Where the days are charged">
        {charges.map((c, i) => (
          <li key={chargeKey(c)} class={SLOT}>
            <button {...card(chargeKey(c))}>
              <span class="flex items-center gap-8">
                <span class={`size-10 flex-none rounded-2 ${chargeTone(c, i)}`} aria-hidden="true" />
                <span class="min-w-0 flex-1 truncate text-13 font-semibold text-ink">{c.costCenter ? costCenterLabel(c.costCenter) : 'No cost center'}</span>
                <span class="text-13 font-medium text-ink tabular-nums">{plural(c.days, 'day')}</span>
              </span>
              <span class="grid grid-cols-1 gap-3 text-13">
                {c.projects.map((x) => (
                  <span key={x.project.id} class="flex justify-between gap-8">
                    <span class="truncate text-ink">{x.project.name}</span>
                    <span class="flex-none whitespace-nowrap text-body tabular-nums">{plural(x.days, 'day')}</span>
                  </span>
                ))}
              </span>
            </button>
          </li>
        ))}
        {off > 0 && (
          <li class={SLOT}>
            <button {...card(OFF_KEY)}>
              <span class="flex items-center gap-8">
                <span class="size-10 flex-none rounded-2 bg-card bg-off-mark inset-ring inset-ring-line" aria-hidden="true" />
                <span class="min-w-0 flex-1 truncate text-13 font-semibold text-ink">Leave and holidays</span>
                <span class="text-13 font-medium text-ink tabular-nums">{plural(off, 'day')}</span>
              </span>
              <span class="grid grid-cols-1 gap-3 text-13">
                {b.off.map(({ entry, days }) => (
                  <span key={entry.id} class="flex justify-between gap-8">
                    <span class="truncate text-ink">
                      {entry.title} · {entrySpan(entry)}
                    </span>
                    <span class="flex-none whitespace-nowrap text-body tabular-nums">{plural(days, 'day')}</span>
                  </span>
                ))}
              </span>
              <span class="text-12 text-body">Not charged</span>
            </button>
          </li>
        )}
      </ul>
      {b.diff > 0 && (
        <p class="flex flex-wrap items-center gap-10 text-13 text-body">
          <span class="pill pill-watch">{balanceLabel(b.diff, b.month, props.now)}</span>
          The month has {plural(b.target, 'working day')}; the ringed blocks are the days past them.
        </p>
      )}
    </div>
  );
}
