import type { BoardCounts } from '../../../core/board';
import { GlanceNumbers } from '../../components/GlanceNumbers';
import { HintTag, useHighlight } from '../../components/highlight';
import { LabelledBlock } from '../../components/LabelledBlock';

/** What to chase, in the same card as the Overview's At a glance: deadlines first, then urgency and waiting. */
export function BoardGlance(props: { counts: BoardCounts }) {
  const { counts: c } = props;
  const h = useHighlight('board-strip');
  return (
    <LabelledBlock id="board-glance-h" title="At a glance">
      <div {...h.attrs} class={`relative overflow-hidden rounded-14 border border-line bg-card shadow-card ${h.ring}`}>
        <HintTag text={h.hint} />
        <GlanceNumbers
          items={[
            { label: 'Overdue', value: c.overdue, tone: 'gold' },
            { label: 'Due in 3 days', value: c.dueSoon, tone: 'gold' },
            { label: 'Urgent', value: c.urgent, tone: 'plain' },
            { label: 'Waiting', value: c.waiting, tone: 'plain', note: c.waiting ? `longest ${c.longestWait}d` : undefined },
          ]}
        />
      </div>
    </LabelledBlock>
  );
}
