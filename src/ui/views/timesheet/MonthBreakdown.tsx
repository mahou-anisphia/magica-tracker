import { costCenterLabel, type CostCenterCharge } from '../../../core/costCenters';
import { plural } from '../../../core/format';
import { balanceLabel, type MonthBalance } from '../../../core/workdays';
import { entrySpan } from '../../components/dueItem';
import { chargeTone } from './MonthBar';

// Cards share the row and keep 220px each; more than fit scroll sideways (a cut-off card hints at it).
const CARD = 'grid flex-[1_0_220px] snap-start content-start gap-8 rounded-12 border border-line bg-card px-14 py-12';

/**
 * The month bar opened: a card per cost center with its shade, its days and
 * the projects behind them, then the leave and holidays, which are never
 * charged, in one row that scrolls sideways when they don't fit. When the
 * month is over, a line says how far.
 */
export function MonthBreakdown(props: { id: string; balance: MonthBalance; charges: CostCenterCharge[]; now: Date }) {
  const { balance: b, charges } = props;
  const off = b.leave + b.holiday;
  return (
    <div id={props.id} class="grid grid-cols-1 gap-12 pt-4">
      <ul class="-mx-4 flex snap-x gap-12 overflow-x-auto px-4 pb-6" aria-label="Where the days are charged">
        {charges.map((c, i) => (
          <li key={c.costCenter?.id ?? 'none'} class={CARD}>
            <span class="flex items-center gap-8">
              <span class={`size-10 flex-none rounded-2 ${chargeTone(c, i)}`} aria-hidden="true" />
              <span class="min-w-0 flex-1 truncate text-13 font-semibold text-ink">{c.costCenter ? costCenterLabel(c.costCenter) : 'No cost center'}</span>
              <span class="text-13 font-medium text-ink tabular-nums">{plural(c.days, 'day')}</span>
            </span>
            <ul class="grid grid-cols-1 gap-3 text-13">
              {c.projects.map((x) => (
                <li key={x.project.id} class="flex justify-between gap-8">
                  <span class="truncate text-ink">{x.project.name}</span>
                  <span class="flex-none whitespace-nowrap text-body tabular-nums">{plural(x.days, 'day')}</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
        {off > 0 && (
          <li class={CARD}>
            <span class="flex items-center gap-8">
              <span class="size-10 flex-none rounded-2 bg-card bg-off-mark inset-ring inset-ring-line" aria-hidden="true" />
              <span class="min-w-0 flex-1 truncate text-13 font-semibold text-ink">Leave and holidays</span>
              <span class="text-13 font-medium text-ink tabular-nums">{plural(off, 'day')}</span>
            </span>
            <ul class="grid grid-cols-1 gap-3 text-13">
              {b.off.map(({ entry, days }) => (
                <li key={entry.id} class="flex justify-between gap-8">
                  <span class="truncate text-ink">
                    {entry.title} · {entrySpan(entry)}
                  </span>
                  <span class="flex-none whitespace-nowrap text-body tabular-nums">{plural(days, 'day')}</span>
                </li>
              ))}
            </ul>
            <span class="text-12 text-body">Not charged</span>
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
