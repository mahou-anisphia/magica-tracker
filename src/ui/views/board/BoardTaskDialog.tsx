import { subtaskProgress } from '../../../core/completion';
import { dueLabel, isDueSoon } from '../../../core/due';
import { shortDay } from '../../../core/format';
import * as ops from '../../../core/ops';
import type { Project, Task } from '../../../core/schema';
import { openProject } from '../../actions';
import { Modal } from '../../components/Modal';
import { PRIORITY_LABEL } from '../../components/PriorityChip';
import { STATUS_LABEL } from '../../components/StatusChip';
import { useLoadFormat } from '../../components/useUnit';
import { update } from '../../store';
import { WaitingOnInput } from './WaitingOnInput';

/**
 * A card's details, from a click: where it stands, its deadline and the
 * rest, and while it waits, what on. Moving it is the board's job (drag);
 * editing the rest happens in the project.
 */
export function BoardTaskDialog(props: {
  project: Project | undefined;
  task: Task | undefined;
  now: Date;
  /** Just dropped in Waiting: start in "Waiting on". */
  askWaitingOn: boolean;
  onClose: () => void;
}) {
  const { project: p, task: t, now } = props;
  const fmtLoad = useLoadFormat();
  const progress = t ? subtaskProgress(t) : { done: 0, total: 0 };
  const rows: [string, string, boolean?][] = t
    ? [
        ['Status', STATUS_LABEL[t.status] + (t.status === 'waiting' && t.waiting ? `, since ${shortDay(t.waiting.since)}` : '')],
        ...(t.due ? [['Deadline', dueLabel(t.due, now, undefined, t.done ? 'ago' : 'overdue'), isDueSoon(t.due, t.done, now)] as [string, string, boolean]] : []),
        ...(t.priority ? [['Priority', PRIORITY_LABEL[t.priority]] as [string, string]] : []),
        ...(progress.total ? [['Sub-tasks', `${progress.done} of ${progress.total} done`] as [string, string]] : []),
        ...(t.effort !== undefined ? [['Allocation', fmtLoad(t.effort)] as [string, string]] : []),
      ]
    : [];

  return (
    <Modal open={!!(p && t)} onClose={props.onClose} labelledBy="board-task-h">
      {p && t && (
        <>
          <div>
            <p class="text-12 font-semibold text-primary-ink">{p.name}</p>
            <h2 id="board-task-h" class="mt-2 text-18">
              {t.title}
            </h2>
          </div>
          <dl class="m-0 grid grid-cols-[auto_minmax(0,1fr)] gap-x-16 gap-y-6 text-14">
            {rows.map(([label, value, watch]) => (
              <div key={label} class="contents">
                <dt class="text-body">{label}</dt>
                <dd class={`m-0 ${watch ? 'font-semibold text-watch-ink' : 'text-ink'}`}>{value}</dd>
              </div>
            ))}
          </dl>
          {t.status === 'waiting' && (
            <WaitingOnInput
              value={t.waiting?.on}
              autoFocus={props.askWaitingOn}
              onSave={(text) => update((r, n) => ops.setTaskWaitingOn(r, p.id, t.id, text, n))}
            />
          )}
          {t.notes && <p class="rounded-10 bg-page px-14 py-10 text-14 whitespace-pre-wrap text-ink">{t.notes}</p>}
          {t.definitionOfDone && (
            <p class="text-14 text-body">
              <span class="font-medium text-ink">Done when: </span>
              {t.definitionOfDone}
            </p>
          )}
          <p class="text-12 text-body">To move it, drag the card to another column.</p>
          <div class="flex flex-wrap justify-end gap-8">
            <button type="button" class="btn btn-quiet" onClick={props.onClose}>
              Close
            </button>
            <button
              type="button"
              class="btn btn-primary"
              autoFocus={!props.askWaitingOn}
              onClick={() => {
                props.onClose();
                openProject(p.id, t.id);
              }}
            >
              Open in project
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
