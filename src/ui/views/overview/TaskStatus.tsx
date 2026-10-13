import { shortDay } from '../../../core/format';
import * as ops from '../../../core/ops';
import { STATUSES, type Project, type Status, type Task } from '../../../core/schema';
import { moveTask } from '../../actions';
import { Segmented } from '../../components/Segmented';
import { STATUS_LABEL } from '../../components/StatusChip';
import { update } from '../../store';
import { DetailField } from './DetailField';
import { DetailRow } from './DetailRow';

/** Rows for where the task stands and, while it waits, on what and since when. */
export function TaskStatus(props: { project: Project; task: Task }) {
  const { project: p, task: t } = props;
  return (
    <>
      <DetailRow label="Status">
        <div>
          <Segmented<Status>
            label={`Status of “${t.title}”`}
            value={t.status}
            options={STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] }))}
            onChange={(s) => void moveTask(p.id, t, s)}
          />
        </div>
      </DetailRow>
      {t.status === 'waiting' && t.waiting && (
        <DetailField
          label="Waiting on"
          value={t.waiting.on}
          placeholder="A person, a meeting, evidence…"
          note={`Since ${shortDay(t.waiting.since)}`}
          onSave={(text) => update((r, n) => ops.setTaskWaitingOn(r, p.id, t.id, text, n))}
        />
      )}
    </>
  );
}
