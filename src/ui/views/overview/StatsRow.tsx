import { allocation, stats } from '../../../core/progress';
import type { Root } from '../../../core/schema';
import { AllocationBar } from '../../components/AllocationBar';
import { GlanceNumbers, type GlanceItem } from '../../components/GlanceNumbers';
import { LabelledBlock } from '../../components/LabelledBlock';

/**
 * "At a glance": one calm board. Four numbers divided by hairlines, the shared
 * allocation bar along the bottom. Only overdue carries a colour, and
 * only when they aren't zero. Archived and done projects don't count. Below
 * 720px the numbers sit two by two.
 */
export function StatsRow(props: { root: Root; now: Date }) {
  const s = stats(props.root, props.now);
  const items: GlanceItem[] = [
    { label: 'Open tasks', value: s.open, tone: 'plain' },
    { label: 'In progress', value: s.inProgress, tone: 'plain' },
    { label: 'Waiting', value: s.waiting, tone: 'plain' },
    { label: 'Overdue', value: s.overdue, tone: 'gold' },
  ];

  return (
    <LabelledBlock id="glance-h" title="At a glance">
      <div class="overflow-hidden rounded-14 border border-line bg-card shadow-card">
        <GlanceNumbers items={items} />
        <AllocationBar allocation={allocation(props.root, props.now)} embedded />
      </div>
    </LabelledBlock>
  );
}
