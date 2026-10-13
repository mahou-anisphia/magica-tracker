import { allocation, stats } from '../../../core/progress';
import type { Root } from '../../../core/schema';
import { escalations } from '../../../core/team';
import { AllocationBar } from '../../components/AllocationBar';
import { GlanceNumbers, type GlanceItem } from '../../components/GlanceNumbers';

/** Their numbers and their allocation, by their own settings. */
export function MemberGlance(props: { root: Root; name: string; now: Date }) {
  const s = stats(props.root, props.now);
  const items: GlanceItem[] = [
    { label: 'Open tasks', value: s.open, tone: 'plain' },
    { label: 'In progress', value: s.inProgress, tone: 'plain' },
    { label: 'Waiting', value: s.waiting, tone: 'plain' },
    { label: 'May be escalated', value: escalations(props.root).length, tone: 'plain' },
  ];
  return (
    <section class="mb-52 overflow-hidden rounded-14 border border-line bg-card shadow-card" aria-label="At a glance">
      <GlanceNumbers items={items} />
      <AllocationBar allocation={allocation(props.root, props.now)} embedded whose={props.name} />
    </section>
  );
}
