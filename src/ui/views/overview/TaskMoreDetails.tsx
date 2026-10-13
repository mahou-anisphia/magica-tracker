import { useId, useState } from 'preact/hooks';
import { shortDay } from '../../../core/format';
import * as ops from '../../../core/ops';
import type { Project, Task } from '../../../core/schema';
import { daysSince } from '../../../core/time';
import { STATUS_LABEL } from '../../components/StatusChip';
import { update } from '../../store';
import { DetailField } from './DetailField';
import { DetailTile } from './DetailTile';
import { MoreDetails } from './MoreDetails';
import { TaskStatus } from './TaskStatus';
import { TileValue } from './TileValue';

/** What the closed fold says is set. */
export function taskDetailSummary(task: Task): string[] {
  const out: string[] = [];
  if (task.status === 'working' || task.status === 'waiting') out.push(STATUS_LABEL[task.status]);
  if (task.escalation) out.push('May be escalated');
  if (task.definitionOfDone) out.push('Definition of done');
  if (task.relatedPeople) out.push('Related people');
  return out;
}

type Tile = 'status' | 'escalation' | 'done' | 'people';

/**
 * The task fields most tasks don't need, folded under "More details" as four
 * tiles in a row: status (and what it waits on), the escalation flag,
 * definition of done and related people. A tile shows its value; clicking it
 * opens its editor under the row. The checkbox stays the quick way to Done,
 * and the Board moves tasks by dragging.
 */
export function TaskMoreDetails(props: { project: Project; task: Task; now: Date }) {
  const { project: p, task: t, now } = props;
  const [open, setOpen] = useState<Tile | null>(null);
  const editorId = `task-tile-${useId()}`;
  const tile = (id: Tile) => ({ open: open === id, controls: editorId, onToggle: () => setOpen(open === id ? null : id) });
  const waited = t.status === 'waiting' && t.waiting ? daysSince(t.waiting.since, now) : 0;

  return (
    <MoreDetails summary={taskDetailSummary(t)}>
      <div class="grid grid-cols-4 gap-10 max-md:grid-cols-2">
        <DetailTile label="Status" tone={t.status === 'waiting' ? 'waiting' : 'set'} {...tile('status')}>
          <TileValue
            main={STATUS_LABEL[t.status] + (waited > 0 ? ` · ${waited}d` : '')}
            sub={t.status === 'waiting' && t.waiting?.on ? `on ${t.waiting.on}` : undefined}
          />
        </DetailTile>
        <DetailTile label="Escalation" tone={t.escalation ? 'flag' : 'empty'} {...tile('escalation')}>
          <TileValue
            main={t.escalation ? 'May be escalated' : undefined}
            sub={t.escalation ? [t.escalation.by && `by ${t.escalation.by}`, `since ${shortDay(t.escalation.since)}`].filter(Boolean).join(' · ') : undefined}
            add="Flag"
          />
        </DetailTile>
        <DetailTile label="Definition of done" tone={t.definitionOfDone ? 'set' : 'empty'} {...tile('done')}>
          <TileValue main={t.definitionOfDone} />
        </DetailTile>
        <DetailTile label="Related people" tone={t.relatedPeople ? 'set' : 'empty'} {...tile('people')}>
          <TileValue main={t.relatedPeople} />
        </DetailTile>
      </div>

      {open && (
        <div id={editorId} class="grid grid-cols-1 gap-10 rounded-12 border border-line bg-card px-14 py-12">
          {open === 'status' && <TaskStatus project={p} task={t} />}
          {open === 'escalation' && (
            <>
              <label class="flex cursor-pointer items-center gap-8 text-14 font-medium text-ink">
                <input
                  type="checkbox"
                  checked={!!t.escalation}
                  onChange={(e) => update((r, n) => ops.setTaskEscalation(r, p.id, t.id, e.currentTarget.checked, n))}
                />
                I may be escalated
              </label>
              {t.escalation ? (
                <div class="grid grid-cols-2 gap-10 max-md:grid-cols-1">
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
                </div>
              ) : (
                <span class="text-13 text-body">A heads-up for your leader: another team may escalate you over this.</span>
              )}
            </>
          )}
          {open === 'done' && (
            <DetailField
              label="Definition of done"
              value={t.definitionOfDone}
              placeholder="Done when…"
              multiline
              onSave={(text) => update((r, n) => ops.setTaskText(r, p.id, t.id, 'definitionOfDone', text, n))}
            />
          )}
          {open === 'people' && (
            <DetailField
              label="Related people"
              value={t.relatedPeople}
              placeholder="Who to contact"
              onSave={(text) => update((r, n) => ops.setTaskText(r, p.id, t.id, 'relatedPeople', text, n))}
            />
          )}
        </div>
      )}
    </MoreDetails>
  );
}
