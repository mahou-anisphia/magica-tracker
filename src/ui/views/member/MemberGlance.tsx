import { allocation, stats } from '../../../core/progress';
import type { Root } from '../../../core/schema';
import { escalations } from '../../../core/team';
import { AllocationBar } from '../../components/AllocationBar';

/** Their numbers and their allocation, by their own settings. */
export function MemberGlance(props: { root: Root; name: string; now: Date }) {
  const s = stats(props.root, props.now);
  const items = [
    { label: 'Open tasks', value: s.open },
    { label: 'In progress', value: s.inProgress },
    { label: 'Blocked', value: s.blocked },
    { label: 'May be escalated', value: escalations(props.root).length },
  ];
  return (
    <section class="mb-52 overflow-hidden rounded-14 border border-line bg-card shadow-card" aria-label="At a glance">
      <dl class="m-0 grid grid-cols-4 max-md:grid-cols-2">
        {items.map((it, i) => (
          <div
            key={it.label}
            class={`grid grid-cols-1 gap-6 border-line px-26 pt-22 pb-20 max-md:px-18 max-md:py-16 ${i > 0 ? 'border-l' : ''} ${
              i % 2 === 0 ? 'max-md:border-l-0' : ''
            } ${i >= 2 ? 'max-md:border-t' : ''}`}
          >
            <dt class="text-13 font-medium text-body">{it.label}</dt>
            <dd class={`m-0 text-28 leading-[1.15] font-medium tracking-[-0.02em] tabular-nums ${it.value ? 'text-ink' : 'text-body'}`}>
              {it.value}
            </dd>
          </div>
        ))}
      </dl>
      <AllocationBar allocation={allocation(props.root, props.now)} embedded whose={props.name} />
    </section>
  );
}
