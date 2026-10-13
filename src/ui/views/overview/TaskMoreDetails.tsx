import * as ops from '../../../core/ops';
import type { Project, Task } from '../../../core/schema';
import { update } from '../../store';
import { DetailField } from './DetailField';
import { MoreDetails } from './MoreDetails';

const shortDay = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' });
const since = (iso: string) => shortDay.format(new Date(iso));

/** What the closed fold says is set. */
export function taskDetailSummary(task: Task): string[] {
  const out: string[] = [];
  if (task.blocked) out.push('Blocked');
  if (task.escalation) out.push('May be escalated');
  if (task.definitionOfDone) out.push('Definition of done');
  if (task.relatedPeople) out.push('Related people');
  return out;
}

/**
 * The task fields most tasks don't need: blocked, the escalation flag,
 * definition of done and related people, folded under "More details".
 */
export function TaskMoreDetails(props: { project: Project; task: Task }) {
  const { project: p, task: t } = props;

  return (
    <MoreDetails summary={taskDetailSummary(t)}>
      <div class="grid grid-cols-2 items-start gap-12 max-lg:grid-cols-1">
        <div class={`grid content-start gap-6 rounded-12 border px-14 py-12 ${t.blocked ? 'border-ink bg-card' : 'border-line'}`}>
          <label class="flex cursor-pointer items-center gap-8 text-14 font-semibold text-ink">
            <input
              type="checkbox"
              checked={!!t.blocked}
              onChange={(e) => update((r, n) => ops.setTaskBlocked(r, p.id, t.id, e.currentTarget.checked, n))}
            />
            Blocked
            {t.blocked && <span class="text-12 font-normal text-body">since {since(t.blocked.since)}</span>}
          </label>
          {t.blocked && (
            <DetailField
              label="Blocker"
              value={t.blocked.blocker}
              placeholder="What is it waiting on?"
              onSave={(text) => update((r, n) => ops.setTaskBlocker(r, p.id, t.id, text, n))}
            />
          )}
        </div>

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
