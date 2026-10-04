import { allocation, stats } from '../../core/progress';
import type { Root } from '../../core/schema';
import { AllocationBar } from './Progress';

type Tone = 'plain' | 'iris' | 'gold';

/**
 * "At a glance": one calm board. Four numbers divided by hairlines, the shared
 * allocation bar along the bottom. Only urgent and overdue carry a colour, and
 * only when they aren't zero. Archived and done projects don't count.
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
    <section class="block glance" aria-labelledby="glance-h">
      <div class="block-head">
        <h2 id="glance-h">At a glance</h2>
      </div>
      <div class="card glance-board">
        <dl class="glance-nums">
          {items.map((it) => (
            <div key={it.label} class={`glance-cell ${it.value > 0 ? it.tone : 'zero'}`}>
              <dt>{it.label}</dt>
              <dd>{it.value}</dd>
            </div>
          ))}
        </dl>
        <AllocationBar allocation={allocation(props.root)} embedded />
      </div>
    </section>
  );
}
