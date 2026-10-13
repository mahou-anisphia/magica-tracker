import { shortDay } from '../../../core/format';
import * as ops from '../../../core/ops';
import { STATUSES, type Project, type Status, type Task } from '../../../core/schema';
import { moveTask } from '../../actions';
import { Segmented } from '../../components/Segmented';
import { STATUS_LABEL } from '../../components/StatusChip';
import { update } from '../../store';
import { DetailField } from './DetailField';

/** Where the task stands, and, while it waits, on what and since when. */
export function TaskStatus(props: { project: Project; task: Task }) {
  const { project: p, task: t } = props;
  return (
    <div class="flex flex-wrap items-center gap-x-14 gap-y-8">
      <span class="text-13 font-medium text-body">Status</span>
      <Segmented<Status>
        label={`Status of “${t.title}”`}
        value={t.status}
        options={STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] }))}
        onChange={(s) => void moveTask(p.id, t, s)}
      />
      {t.status === 'waiting' && t.waiting && (
        <div class="flex min-w-0 flex-1 basis-260 items-center gap-10">
          <div class="min-w-0 flex-1">
            <DetailField
              label="Waiting on"
              value={t.waiting.on}
              placeholder="A person, a meeting, evidence…"
              onSave={(text) => update((r, n) => ops.setTaskWaitingOn(r, p.id, t.id, text, n))}
            />
          </div>
          <span class="text-12 whitespace-nowrap text-body">since {shortDay(t.waiting.since)}</span>
        </div>
      )}
    </div>
  );
}
