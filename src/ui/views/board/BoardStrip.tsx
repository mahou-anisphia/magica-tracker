import { dayHeading } from '../../../core/format';
import type { BoardCounts } from '../../../core/board';
import { HintTag, useHighlight } from '../../components/highlight';

/** Today, and the few numbers that decide what to chase: deadlines, urgency, waiting. */
export function BoardStrip(props: { counts: BoardCounts; now: Date }) {
  const { counts: c } = props;
  const h = useHighlight('board-strip');
  const items = [
    { label: 'Overdue', value: c.overdue, watch: true },
    { label: 'Due in 3 days', value: c.dueSoon, watch: true },
    { label: 'Urgent', value: c.urgent, watch: false },
    { label: 'Waiting', value: c.waiting, watch: false, note: c.waiting ? `longest ${c.longestWait}d` : undefined },
  ];
  return (
    <section
      {...h.attrs}
      aria-label="Today"
      class={`relative mb-24 flex flex-wrap items-center gap-x-28 gap-y-10 rounded-14 border border-line bg-card px-22 py-14 shadow-card ${h.ring}`}
    >
      <HintTag text={h.hint} />
      <span class="mr-auto text-17 font-semibold text-ink">{dayHeading(props.now)}</span>
      <dl class="m-0 flex flex-wrap items-baseline gap-x-24 gap-y-6">
        {items.map((it) => (
          <div key={it.label} class="flex items-baseline gap-6">
            <dt class="text-13 text-body">{it.label}</dt>
            <dd
              class={`m-0 text-17 font-semibold tabular-nums ${
                it.value === 0 ? 'text-faint' : it.watch ? 'text-watch-ink' : 'text-ink'
              }`}
            >
              {it.value}
            </dd>
            {it.note && <span class="text-12 text-body">{it.note}</span>}
          </div>
        ))}
      </dl>
    </section>
  );
}
