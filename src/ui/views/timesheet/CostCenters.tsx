import { useState } from 'preact/hooks';
import { chargesIn, costCenterOf } from '../../../core/costCenters';
import { isProjectDone } from '../../../core/completion';
import { monthName, plural } from '../../../core/format';
import type { Project, Root } from '../../../core/schema';
import { PlusIcon } from '../../components/icons';
import { Panel } from '../../components/Panel';
import { CostCenterForm } from './CostCenterForm';
import { CostCenterRow, type ChargedProject } from './CostCenterRow';

/**
 * Everything about cost centers, for the month shown: each one in its own
 * order with the days charged to it, opening to its projects (charged this
 * month, or charged to it from now on), a way to add one, and rename or
 * delete. Days charged to none come last, with the active projects that have
 * no cost center. Leave and holidays aren't charged, and say so at the foot.
 */
export function CostCenters(props: { root: Root; month: string; daysOff: number }) {
  const { root, month } = props;
  const [adding, setAdding] = useState(false);
  const centers = root.costCenters ?? [];
  const charges = chargesIn(root, month);
  const active = (p: Project) => !p.archived && !isProjectDone(p);

  /** Projects charged to it this month, then active ones charged to it from now on without days here yet. */
  const rowFor = (id: string | null) => {
    const charge = charges.find((c) => (c.costCenter?.id ?? null) === id);
    const projects: ChargedProject[] = charge ? charge.projects.map((x) => ({ project: x.project, days: x.days })) : [];
    for (const p of root.projects) {
      if (!active(p) || projects.some((x) => x.project === p)) continue;
      if ((costCenterOf(root, p)?.id ?? null) === id && !p.timesheet?.some((t) => t.month === month)) projects.push({ project: p, days: null });
    }
    return { days: charge?.days ?? 0, projects };
  };
  const none = rowFor(null);

  return (
    <Panel
      id="timelog-centers-h"
      title="Cost centers"
      highlight="timelog-costcenters"
      note={`Where ${monthName(month)}’s days are charged.`}
      aside={
        !adding && (
          <button type="button" class="btn btn-quiet btn-small text-primary-ink" onClick={() => setAdding(true)}>
            <PlusIcon size={14} />
            New
          </button>
        )
      }
    >
      {adding && <CostCenterForm onDone={() => setAdding(false)} />}
      {centers.length === 0 && !adding && <p class="text-14 text-body">None yet. Add one, then pick it for a project here or in its More details.</p>}
      {(centers.length > 0 || none.days > 0) && (
        <ul class="-mx-22 max-md:-mx-16">
          {centers.map((c) => {
            const row = rowFor(c.id);
            return (
              <CostCenterRow
                key={c.id}
                costCenter={c}
                days={row.days}
                projects={row.projects}
                others={root.projects.filter((p) => active(p) && p.costCenterId !== c.id)}
              />
            );
          })}
          {(none.days > 0 || (centers.length > 0 && none.projects.length > 0)) && (
            <CostCenterRow costCenter={null} days={none.days} projects={none.projects} others={[]} />
          )}
        </ul>
      )}
      {props.daysOff > 0 && (
        <p class="flex items-center gap-8 text-13 text-body">
          <span class="pill bg-card bg-off text-ink inset-ring inset-ring-line">{plural(props.daysOff, 'day')}</span>
          Leave and holidays, not charged
        </p>
      )}
    </Panel>
  );
}
