import { useId, useState } from 'preact/hooks';
import { monthName, plural } from '../../../core/format';
import * as ops from '../../../core/ops';
import type { Project } from '../../../core/schema';
import { localDateStamp } from '../../../core/time';
import { isTracking, monthOf, timesheetDays } from '../../../core/workdays';
import { openTimeLog } from '../../actions';
import { update, useStore } from '../../store';
import { DetailField } from './DetailField';
import { DetailTile } from './DetailTile';
import { MoreDetails } from './MoreDetails';
import { TileValue } from './TileValue';

type Tile = 'done' | 'people' | 'timesheet';

/**
 * A project's definition of done and related people, folded away as tiles,
 * and, once a timesheet is kept (or the project has days on it), the days
 * it was given: this month's and in all.
 */
export function ProjectMoreDetails(props: { project: Project; now: Date }) {
  const p = props.project;
  const { root } = useStore();
  const [open, setOpen] = useState<Tile | null>(null);
  const editorId = `project-tile-${useId()}`;
  const tile = (id: Tile) => ({ open: open === id, controls: editorId, onToggle: () => setOpen(open === id ? null : id) });
  const month = monthOf(localDateStamp(props.now));
  const months = [...(p.timesheet ?? [])].reverse();
  const first = p.timesheet?.[0]?.month;
  const total = timesheetDays(p);
  const thisMonth = timesheetDays(p, month);
  const showTimesheet = isTracking(root) || months.length > 0;
  const summary = [p.definitionOfDone && 'Definition of done', p.relatedPeople && 'Related people', total > 0 && 'Timesheet'].filter(
    (x): x is string => !!x,
  );
  return (
    <MoreDetails summary={summary}>
      {/* With the Timesheet, three tiles share the row, so "5 days in October" fits. */}
      <div class={`grid gap-10 max-md:grid-cols-2 ${showTimesheet ? 'grid-cols-3' : 'grid-cols-4'}`}>
        <DetailTile label="Definition of done" tone={p.definitionOfDone ? 'set' : 'empty'} {...tile('done')}>
          <TileValue main={p.definitionOfDone} />
        </DetailTile>
        <DetailTile label="Related people" tone={p.relatedPeople ? 'set' : 'empty'} {...tile('people')}>
          <TileValue main={p.relatedPeople} />
        </DetailTile>
        {showTimesheet && (
          <DetailTile label="Timesheet" tone={total ? 'set' : 'empty'} {...tile('timesheet')}>
            {total && first ? (
              <>
                <span class="text-14 text-ink">
                  <strong class="font-semibold">{plural(thisMonth, 'day')}</strong> in {monthName(month)}
                </span>
                <span class="truncate text-12 text-body">
                  {total} since {monthName(first, 'short')}
                </span>
              </>
            ) : (
              <TileValue add="Give days" />
            )}
          </DetailTile>
        )}
      </div>
      {open && (
        <div id={editorId} class="grid grid-cols-1 gap-10 rounded-12 border border-line bg-card px-14 py-12">
          {open === 'timesheet' ? (
            <>
              {months.length > 0 ? (
                <ul class="grid grid-cols-1 gap-4 text-14 tabular-nums">
                  {months.slice(0, 6).map((t) => (
                    <li key={t.month} class="flex justify-between gap-12">
                      <span class="text-ink">{monthName(t.month, t.month.slice(0, 4) !== month.slice(0, 4))}</span>
                      <span class="text-body">{plural(t.days, 'day')}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p class="text-14 text-body">No days given to this project yet.</p>
              )}
              <button type="button" class="justify-self-start text-13 font-medium text-primary-ink hover:underline" onClick={() => openTimeLog(month)}>
                Change on the Time log
              </button>
            </>
          ) : open === 'done' ? (
            <DetailField
              label="Definition of done"
              value={p.definitionOfDone}
              placeholder="Done when…"
              multiline
              onSave={(text) => update((r, n) => ops.setProjectText(r, p.id, 'definitionOfDone', text, n))}
            />
          ) : (
            <DetailField
              label="Related people"
              value={p.relatedPeople}
              placeholder="Who to contact"
              onSave={(text) => update((r, n) => ops.setProjectText(r, p.id, 'relatedPeople', text, n))}
            />
          )}
        </div>
      )}
    </MoreDetails>
  );
}
