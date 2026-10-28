import { chargedTo, costCenterLabel, costCenterOf } from '../../../core/costCenters';
import { monthName } from '../../../core/format';
import type { Project, Root } from '../../../core/schema';
import { chargeProject } from '../../actions';
import { Select } from '../../components/Select';

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
    <Select
      variant="quiet"
      class="max-w-full justify-self-start"
      label={`Cost center for ${p.name} in ${monthName(month)}`}
      value={charged?.id ?? ''}
      options={[{ value: '', label: 'No cost center' }, ...centers.map((c) => ({ value: c.id, label: costCenterLabel(c) }))]}
      onChange={(id) => chargeProject(p.id, month, id || undefined)}
    />
  );
}
