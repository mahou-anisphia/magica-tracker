import { allocation, stats } from '../../../core/progress';
import type { Root } from '../../../core/schema';
import { AllocationBar } from './AllocationBar';
import { OverviewBlock } from './OverviewBlock';

type Tone = 'plain' | 'iris' | 'gold';

const VALUE: Record<Tone | 'zero', string> = {
  zero: 'text-slate',
  plain: 'text-deep',
  iris: 'text-iris-deep',
  gold: 'text-gold-ink',
};

const MARK: Record<Tone | 'zero', string> = {
  zero: '',
  plain: '',
  iris: "before:size-7 before:rounded-full before:bg-iris-deep before:content-['']",
  gold: "before:size-7 before:rounded-full before:bg-gold before:content-['']",
};

/**
 * "At a glance": one calm board. Four numbers divided by hairlines, the shared
 * allocation bar along the bottom. Only urgent and overdue carry a colour, and
 * only when they aren't zero. Archived and done projects don't count. Below
 * 720px the numbers sit two by two.
 */
export function StatsRow(props: { root: Root; now: Date }) {
  const s = stats(props.root, props.now);
  const items: { label: string; value: number; tone: Tone }[] = [
    { label: 'Open tasks', value: s.open, tone: 'plain' },
    { label: 'In progress', value: s.inProgress, tone: 'plain' },
    { label: 'Urgent tasks', value: s.urgent, tone: 'iris' },
    { label: 'Overdue', value: s.overdue, tone: 'gold' },
  ];

  return (
    <OverviewBlock id="glance-h" title="At a glance">
      <div class="overflow-hidden rounded-14 border border-line bg-card shadow-card">
        <dl class="m-0 grid grid-cols-4 max-md:grid-cols-2">
          {items.map((it, i) => {
            const tone = it.value > 0 ? it.tone : 'zero';
            // Hairlines between cells: one row of four, or two rows of two.
            const lines = `${i > 0 ? 'border-l' : ''} ${i % 2 === 0 ? 'max-md:border-l-0' : ''} ${i >= 2 ? 'max-md:border-t' : ''}`;
            return (
              <div key={it.label} class={`grid grid-cols-1 gap-6 border-line px-26 pt-22 pb-20 max-md:px-18 max-md:py-16 ${lines}`}>
                <dt class={`flex items-center gap-8 text-13 font-medium text-slate ${MARK[tone]}`}>{it.label}</dt>
                <dd class={`m-0 text-28 leading-[1.15] font-medium tracking-[-0.02em] tabular-nums ${VALUE[tone]}`}>
                  {it.value}
                </dd>
              </div>
            );
          })}
        </dl>
        <AllocationBar allocation={allocation(props.root)} embedded />
      </div>
    </OverviewBlock>
  );
}
