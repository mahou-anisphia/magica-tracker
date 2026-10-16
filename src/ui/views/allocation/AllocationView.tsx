import { useState } from 'preact/hooks';
import { plural } from '../../../core/format';
import { allocationHistory } from '../../../core/progress';
import type { Root } from '../../../core/schema';
import { loadParts } from '../../../core/units';
import { rangeLabel } from '../../components/AllocationBar';
import { GlanceNumbers } from '../../components/GlanceNumbers';
import { Panel } from '../../components/Panel';
import { useLoadFormat, useUnit } from '../../components/useUnit';
import { ViewHeader } from '../../components/ViewHeader';
import { go } from '../../store';
import { AllocationChart } from './AllocationChart';
import { PeriodTasks } from './PeriodTasks';

/** How many periods back the chart reaches, this one included. */
const PERIODS = 12;

/**
 * Your allocation over time: each week or fortnight against your limit, the
 * same sums as the Overview's bar, and what filled the one you pick. Worked
 * out from your tasks as they are now, so a deleted task leaves no trace.
 */
export function AllocationView(props: { root: Root; now: Date }) {
  const history = allocationHistory(props.root, props.now, PERIODS);
  const current = history.at(-1)!;
  const [picked, setPicked] = useState(current.range.start);
  const shown = history.find((a) => a.range.start === picked) ?? current;
  const { period, maxLoad } = current;
  const unit = useUnit();
  const fmt = useLoadFormat(period);
  const amount = (percent: number) => loadParts(percent, period, unit);
  const past = history.slice(0, -1);
  const average = past.length ? past.reduce((n, a) => n + a.total, 0) / past.length : current.total;
  const of = past.length ? `of ${past.length}` : undefined;
  const isNow = shown === current;
  const note =
    shown.total > maxLoad ? `past the ${fmt(maxLoad)} limit` : shown.total > 100 ? `${fmt(shown.total - 100)} over` : `${fmt(100 - shown.total)} free`;

  return (
    <>
      <ViewHeader title="Allocation">
        Each {period} against your {fmt(maxLoad)} limit. Finished work stays in the {period} it counted in.
      </ViewHeader>
      <div class="mb-24 overflow-hidden rounded-14 border border-line bg-card shadow-card">
        <GlanceNumbers
          items={[
            { label: `This ${period}`, ...amount(current.total), tone: 'plain' },
            { label: past.length ? `Average, last ${plural(past.length, period)}` : 'Average', ...amount(average), tone: 'plain' },
            { label: `Over ${fmt(100)}`, value: past.filter((a) => a.total > 100).length, tone: 'plain', note: of },
            { label: 'Past the limit', value: past.filter((a) => a.total > maxLoad).length, tone: 'gold', note: of },
          ]}
        />
      </div>
      <div class="grid grid-cols-1 gap-24">
        <Panel
          id="alloc-chart-h"
          title={`By ${period}`}
          highlight="alloc-chart"
          note="Pick one to see what filled it."
          aside={
            <button type="button" class="btn btn-quiet btn-small text-primary-ink" onClick={() => go('settings', { key: 'settings-alloc' })}>
              Period and limit
            </button>
          }
        >
          <AllocationChart history={history} picked={shown.range.start} onPick={setPicked} />
        </Panel>
        <Panel
          id="alloc-detail-h"
          title={isNow ? `This ${period}, ${rangeLabel(shown.range)}` : `The ${period} of ${rangeLabel(shown.range)}`}
          highlight="alloc-detail"
          note={shown.tasks ? `${plural(shown.tasks, 'task')}, ${shown.done === shown.tasks ? 'all' : shown.done || 'none'} done` : undefined}
          aside={
            <span class="flex items-baseline gap-10">
              <span class={`text-22 font-medium tracking-[-0.02em] tabular-nums ${shown.total > 100 ? 'text-watch-ink' : 'text-ink'}`}>
                {fmt(shown.total)}
              </span>
              <span class={`text-13 whitespace-nowrap ${shown.total > 100 ? 'rounded-full bg-watch-tint px-10 py-1 font-medium text-watch-ink' : 'text-body'}`}>
                {note}
              </span>
            </span>
          }
        >
          <PeriodTasks root={props.root} allocation={shown} />
        </Panel>
      </div>
    </>
  );
}
