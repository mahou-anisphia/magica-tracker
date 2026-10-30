import { useId, useState } from 'preact/hooks';
import { chargedTo, costCenterLabel, costCenterOf } from '../../../core/costCenters';
import { monthName, plural } from '../../../core/format';
import * as ops from '../../../core/ops';
import type { Project, TimesheetMonth } from '../../../core/schema';
import { localDateStamp } from '../../../core/time';
import { isTracking, monthOf, timesheetDays } from '../../../core/workdays';
import { openTimeLog, setProjectCostCenter, setTimesheetDays } from '../../actions';
import { DayStepper } from '../../components/DayStepper';
import { Select } from '../../components/Select';
import { go, update, useStore } from '../../store';
import { DetailField } from './DetailField';
import { DetailTile } from './DetailTile';
import { MoreDetails } from './MoreDetails';
import { TileValue } from './TileValue';

type Tile = 'done' | 'people' | 'timesheet' | 'center';

/** Two tiles keep the narrow four-column grid; three or four share the row. */
const COLUMNS: Record<number, string> = { 2: 'grid-cols-4', 3: 'grid-cols-3', 4: 'grid-cols-4' };

/**
 * A project's definition of done and related people, folded away as tiles;
 * once a timesheet is kept (or the project has days on it), the days it was
 * given, this month's (set right there) and in all; and, once there are cost
 * centers, the one its days are charged to.
 */
export function ProjectMoreDetails(props: { project: Project; now: Date }) {
  const p = props.project;
  const { root } = useStore();
  const [open, setOpen] = useState<Tile | null>(null);
  const editorId = `project-tile-${useId()}`;
  const tile = (id: Tile) => ({ open: open === id, controls: editorId, onToggle: () => setOpen(open === id ? null : id) });
  const month = monthOf(localDateStamp(props.now));
  const months = [...(p.timesheet ?? [])].reverse();
  /** Every month but this one (it has its own stepper), newest first. */
  const earlier = months.filter((t) => t.month !== month);
  const first = p.timesheet?.[0]?.month;
  const total = timesheetDays(p);
  const thisMonth = timesheetDays(p, month);
  const showTimesheet = isTracking(root) || months.length > 0;
  const center = costCenterOf(root, p);
  const centers = root.costCenters ?? [];
  const showCenter = centers.length > 0;
  const chargeLabel = (t: TimesheetMonth) => {
    const c = chargedTo(root, t);
    return c ? costCenterLabel(c) : 'no cost center';
  };
  const summary = [
    p.definitionOfDone && 'Definition of done',
    p.relatedPeople && 'Related people',
    total > 0 && 'Timesheet',
    center && costCenterLabel(center),
  ].filter((x): x is string => !!x);
  return (
    <MoreDetails summary={summary}>
      {/* With the Timesheet (and the cost center), the tiles share the row, so "5 days in October" fits. */}
      <div class={`grid gap-10 max-md:grid-cols-2 ${COLUMNS[2 + Number(showTimesheet) + Number(showCenter)]}`}>
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
        {showCenter && (
          <DetailTile label="Cost center" tone={center ? 'set' : 'empty'} {...tile('center')}>
            <TileValue main={center?.name ?? center?.code} sub={center?.name ? center.code : undefined} add="Set" />
          </DetailTile>
        )}
      </div>
      {open && (
        <div id={editorId} class="grid grid-cols-1 gap-10 rounded-12 border border-line bg-card px-14 py-12">
          {open === 'timesheet' ? (
            <>
              <div class="flex flex-wrap items-center justify-between gap-12">
                <span class="text-14 font-medium text-ink">{monthName(month)}</span>
                <DayStepper name={p.name} days={thisMonth} onChange={(d) => setTimesheetDays(p.id, month, d)} />
              </div>
              {earlier.length > 0 ? (
                <ul class="grid grid-cols-1 gap-4 border-t border-line pt-10 text-14 tabular-nums">
                  {earlier.slice(0, 6).map((t) => (
                    <li key={t.month} class="flex justify-between gap-12">
                      <span class="text-ink">{monthName(t.month, t.month.slice(0, 4) !== month.slice(0, 4))}</span>
                      <span class="text-body">
                        {plural(t.days, 'day')}
                        {showCenter && ` · ${chargeLabel(t)}`}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                !thisMonth && <p class="text-14 text-body">No days given to this project yet.</p>
              )}
              <button type="button" class="justify-self-start text-13 font-medium text-primary-ink hover:underline" onClick={() => openTimeLog(month)}>
                Open the Time log
              </button>
            </>
          ) : open === 'center' ? (
            <>
              <div class="flex flex-wrap items-center justify-between gap-12">
                <span class="text-14 font-medium text-ink" aria-hidden="true">
                  Charged to
                </span>
                <Select
                  label="Charged to"
                  class="max-w-full"
                  value={center?.id ?? ''}
                  options={[{ value: '', label: 'No cost center' }, ...centers.map((c) => ({ value: c.id, label: costCenterLabel(c) }))]}
                  onChange={(id) => setProjectCostCenter(p.id, id || undefined)}
                />
              </div>
              <p class="text-12 text-body">A change charges this month and later to the new one; earlier months keep the cost center they were charged to.</p>
              <button
                type="button"
                class="justify-self-start text-13 font-medium text-primary-ink hover:underline"
                onClick={() => go('timelog', { key: 'timelog-costcenters' })}
              >
                Manage cost centers
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
