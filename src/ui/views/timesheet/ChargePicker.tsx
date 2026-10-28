import { chargedTo, costCenterLabel, costCenterOf } from '../../../core/costCenters';
import { monthName } from '../../../core/format';
import type { Project, Root } from '../../../core/schema';
import { chargeProject } from '../../actions';
import { ChevronIcon } from '../../components/icons';

/**
 * Where a project's days in the shown month are charged, as a quiet picker
 * under its name. From this month on it sets the project's cost center; for a
 * month already over it re-charges that month alone. A past month without
 * days has nothing to charge, so it only says where new days would go.
 */
export function ChargePicker(props: { root: Root; project: Project; month: string; current: string }) {
  const { root, project: p, month } = props;
  const entry = p.timesheet?.find((t) => t.month === month);
  const charged = entry && month < props.current ? chargedTo(root, entry) : costCenterOf(root, p);
  const centers = root.costCenters ?? [];
  if (month < props.current && !entry) {
    return <span class="truncate text-12 text-body">{charged ? costCenterLabel(charged) : 'No cost center'}</span>;
  }
  return (
    <span class="relative inline-flex max-w-full items-center gap-2 justify-self-start text-12 text-body hover:text-primary-ink">
      <select
        class="field-sizing-content max-w-full cursor-pointer appearance-none truncate bg-transparent pr-16 text-12 text-inherit"
        aria-label={`Cost center for ${p.name} in ${monthName(month)}`}
        value={charged?.id ?? ''}
        onChange={(e) => chargeProject(p.id, month, e.currentTarget.value || undefined)}
      >
        <option value="">No cost center</option>
        {centers.map((c) => (
          <option key={c.id} value={c.id}>
            {costCenterLabel(c)}
          </option>
        ))}
      </select>
      <span class="pointer-events-none absolute right-0 inline-flex scale-75" aria-hidden="true">
        <ChevronIcon dir="down" />
      </span>
    </span>
  );
}
