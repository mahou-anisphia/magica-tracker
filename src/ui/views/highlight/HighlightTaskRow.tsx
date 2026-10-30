import { dayLabel, type HighlightItem } from '../../../core/highlight';
import { StatusChip } from '../../components/StatusChip';
import { OutcomeInput } from './OutcomeInput';

/** One task as the highlight sees it: its title, where it sits and when it was done, and its outcome once done. */
export function HighlightTaskRow(props: { item: HighlightItem }) {
  const i = props.item;
  const meta = [i.project ?? (i.taskId ? '' : 'Event'), i.doneOn && `Done ${dayLabel(i.doneOn)}`, i.waitingOn && `on ${i.waitingOn}`];
  return (
    <li class="grid grid-cols-1 gap-6 px-22 py-10 max-md:px-16">
      <div class="flex min-w-0 items-center gap-8">
        <span class="min-w-0 flex-1 text-14 font-medium text-ink">{i.title}</span>
        {i.status !== 'done' && <StatusChip status={i.status} />}
      </div>
      <span class="text-12 text-body">{meta.filter(Boolean).join(' · ')}</span>
      {i.status === 'done' && i.projectId && i.taskId && <OutcomeInput projectId={i.projectId} taskId={i.taskId} title={i.title} value={i.outcome} />}
    </li>
  );
}
