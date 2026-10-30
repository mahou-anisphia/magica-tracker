import { rangeLabel, type DateRange, type HighlightItem } from '../../../core/highlight';
import { plural } from '../../../core/format';
import { Panel } from '../../components/Panel';
import { HighlightTaskRow } from './HighlightTaskRow';

/**
 * What goes under the prompt, in the order it's written: done in the range,
 * then (when asked) in progress now. A finished task takes an outcome right
 * here, since this is where a missing one shows.
 */
export function HighlightTasks(props: { items: HighlightItem[]; range: DateRange; inProgress: boolean }) {
  const { items } = props;
  const done = items.filter((i) => i.status === 'done');
  const open = items.length - done.length;
  const missing = done.filter((i) => i.taskId && !i.outcome).length;
  const note = [
    `${done.length} done`,
    props.inProgress ? `${open} in progress` : '',
    missing ? `${missing} without an outcome` : '',
  ].filter(Boolean).join(' · ');

  return (
    <Panel id="highlight-tasks-h" title="Tasks" highlight="highlight-tasks" note={items.length ? note : undefined}>
      {items.length === 0 ? (
        <p class="text-14 text-body">Nothing done in {rangeLabel(props.range)}{props.inProgress ? ', and nothing in progress' : ''}.</p>
      ) : (
        <ul class="-mx-22 -mb-20 divide-y divide-line border-t border-line max-md:-mx-16" aria-label={plural(items.length, 'task')}>
          {items.map((i) => (
            <HighlightTaskRow key={i.key} item={i} />
          ))}
        </ul>
      )}
    </Panel>
  );
}
