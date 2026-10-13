import * as ops from '../../../core/ops';
import type { Project, Task } from '../../../core/schema';
import { STATUS_LABEL } from '../../components/StatusChip';
import { update } from '../../store';
import { DetailField } from './DetailField';
import { MoreDetails } from './MoreDetails';
import { TaskStatus } from './TaskStatus';

/** What the closed fold says is set. */
export function taskDetailSummary(task: Task): string[] {
  const out: string[] = [];
  if (task.status === 'working' || task.status === 'waiting') out.push(STATUS_LABEL[task.status]);
  if (task.escalation) out.push('May be escalated');
  if (task.definitionOfDone) out.push('Definition of done');
  if (task.relatedPeople) out.push('Related people');
  return out;
}

/**
 * The task fields most tasks don't need, folded under "More details": its
 * status (with what it waits on, while waiting), the escalation flag,
 * definition of done and related people. The checkbox stays the quick way
 * to Done, and the Board moves tasks by dragging.
 */
export function TaskMoreDetails(props: { project: Project; task: Task }) {
  const { project: p, task: t } = props;

  return (
    <MoreDetails summary={taskDetailSummary(t)}>
      <TaskStatus project={p} task={t} />
      <div class="grid grid-cols-2 items-start gap-12 max-lg:grid-cols-1">
        <div
          class={`grid content-start gap-6 rounded-12 px-14 py-12 ${t.escalation ? 'bg-primary-tint' : 'border border-line'}`}
        >
          <label class="flex cursor-pointer items-center gap-8 text-14 font-semibold text-ink">
            <input
              type="checkbox"
              checked={!!t.escalation}
              onChange={(e) => update((r, n) => ops.setTaskEscalation(r, p.id, t.id, e.currentTarget.checked, n))}
            />
            I may be escalated
          </label>
          {t.escalation ? (
            <>
              <DetailField
                label="By"
                value={t.escalation.by}
                placeholder="Which team?"
                onSave={(text) => update((r, n) => ops.setTaskEscalationDetail(r, p.id, t.id, 'by', text, n))}
              />
              <DetailField
                label="Why"
                value={t.escalation.why}
                placeholder="What do they need?"
                onSave={(text) => update((r, n) => ops.setTaskEscalationDetail(r, p.id, t.id, 'why', text, n))}
              />
            </>
          ) : (
            <span class="text-13 text-body">A heads-up for your leader: another team may escalate you over this.</span>
          )}
        </div>
      </div>

      <div class="grid grid-cols-2 gap-12 max-lg:grid-cols-1">
        <DetailField
          label="Definition of done"
          value={t.definitionOfDone}
          placeholder="Done when…"
          multiline
          onSave={(text) => update((r, n) => ops.setTaskText(r, p.id, t.id, 'definitionOfDone', text, n))}
        />
        <DetailField
          label="Related people"
          value={t.relatedPeople}
          placeholder="Who to contact"
          onSave={(text) => update((r, n) => ops.setTaskText(r, p.id, t.id, 'relatedPeople', text, n))}
        />
      </div>
    </MoreDetails>
  );
}
