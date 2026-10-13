import { shortDay } from '../../../core/format';
import * as ops from '../../../core/ops';
import { STATUSES, type Project, type Status, type Task } from '../../../core/schema';
import { moveTask } from '../../actions';
import { Segmented } from '../../components/Segmented';
import { STATUS_LABEL } from '../../components/StatusChip';
import { update } from '../../store';
import { DetailField } from './DetailField';

/** The Status tile's editor: where the task stands and, while it waits, on what. */
export function TaskStatus(props: { project: Project; task: Task }) {
  const { project: p, task: t } = props;
  return (
    <div class="grid grid-cols-1 gap-10">
      <div>
        <Segmented<Status>
          label={`Status of “${t.title}”`}
          value={t.status}
          options={STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] }))}
          onChange={(s) => void moveTask(p.id, t, s)}
        />
      </div>
      {t.status === 'waiting' && t.waiting && (
        <div class="grid grid-cols-1 gap-4">
          <DetailField
            label="Waiting on"
            value={t.waiting.on}
            placeholder="A person, a meeting, evidence…"
            onSave={(text) => update((r, n) => ops.setTaskWaitingOn(r, p.id, t.id, text, n))}
          />
          <span class="text-12 text-body">Since {shortDay(t.waiting.since)}</span>
        </div>
      )}
    </div>
  );
}
