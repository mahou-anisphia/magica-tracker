import { isProjectDone } from '../../../core/completion';
import { byDomain } from '../../../core/domains';
import type { Root } from '../../../core/schema';
import { onTimesheet, timesheetDays, type MonthBalance } from '../../../core/workdays';
import { copyTimesheetMonth, setTimesheetDays } from '../../actions';
import { Panel } from '../../components/Panel';
import { DayStepper } from '../../components/DayStepper';
import { Select } from '../../components/Select';
import { ChargePicker } from './ChargePicker';

/**
 * Whole days to each project this month, grouped by domain. Active projects
 * are listed, a done or archived one through the month it ended in, and any
 * project already given days this month; "Other project" brings in one more
 * of the rest. Once there are cost centers, each row picks where its days
 * are charged.
 */
export function ProjectDays(props: { root: Root; balance: MonthBalance; current: string; previous: { month: string; name: string } }) {
  const { root, balance } = props;
  const { month } = balance;
  const isActive = (p: Root['projects'][number]) => !p.archived && !isProjectDone(p);
  const shown = root.projects.filter((p) => onTimesheet(p, month));
  const others = root.projects.filter((p) => !shown.includes(p));
  const groups = byDomain(root, shown, (p) => p);
  const hadDays = root.projects.some((p) => timesheetDays(p, props.previous.month) > 0);
  const hasCenters = !!root.costCenters?.length;

  return (
    <Panel
      id="timelog-projects-h"
      title="Projects"
      highlight="timelog-projects"
      note="Whole days for the month. Dates and order don’t matter, only the total."
      aside={
        hadDays && (
          <button
            type="button"
            class="btn btn-quiet btn-small text-primary-ink"
            onClick={() => copyTimesheetMonth(props.previous.month, month, props.previous.name)}
          >
            Copy {props.previous.name}
          </button>
        )
      }
    >
      {shown.length === 0 && <p class="text-14 text-body">No projects yet. Make one on the Overview, then give it days here.</p>}
      <div class="-mx-22 max-md:-mx-16">
        {groups.map((g) => (
          <section key={g.domain?.id ?? 'none'} aria-label={g.domain?.name ?? 'Uncategorized'}>
            {groups.length > 1 && (
              <h3 class="border-t border-line px-22 pt-14 pb-6 text-12 font-semibold tracking-[0.04em] text-body uppercase max-md:px-16">
                {g.domain?.name ?? 'Uncategorized'}
              </h3>
            )}
            <ul>
              {g.items.map((p) => (
                <li key={p.id} class="flex min-h-52 items-center gap-12 border-t border-line px-22 py-8 max-md:px-16">
                  <span class="grid min-w-0 flex-1 grid-cols-1">
                    <span class="truncate font-medium text-ink" title={p.name}>
                      {p.name}
                    </span>
                    {!isActive(p) && <span class="text-12 text-body">{p.archived ? 'Archived' : 'Done'}</span>}
                    {hasCenters && <ChargePicker root={root} project={p} month={month} current={props.current} />}
                  </span>
                  <DayStepper name={p.name} days={timesheetDays(p, month)} onChange={(d) => setTimesheetDays(p.id, month, d)} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      {others.length > 0 && (
        <Select
          variant="dashed"
          label="Give days to another project"
          placeholder="+ Other project (archived or done)"
          value=""
          options={others.map((p) => ({ value: p.id, label: p.name }))}
          onChange={(id) => setTimesheetDays(id, month, 1)}
        />
      )}
    </Panel>
  );
}
