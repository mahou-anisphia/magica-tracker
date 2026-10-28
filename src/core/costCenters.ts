import type { CostCenter, Project, Root, TimesheetMonth } from './schema';

/**
 * Cost centers: what the finance timesheet charges days to. They have
 * nothing to do with domains; a project may have one or none. A month's days
 * are charged to the cost center they were given under, so changing a
 * project's cost center never moves days already charged elsewhere. Leave
 * and holidays are never charged.
 */

/** "CC-4120 · Research", or just the code or the name. */
export function costCenterLabel(c: CostCenter): string {
  return [c.code?.trim(), c.name?.trim()].filter(Boolean).join(' · ');
}

const find = (root: Root, id: string | undefined) => (id ? root.costCenters?.find((c) => c.id === id) : undefined);

/** A project's cost center, if it has one that still exists. */
export function costCenterOf(root: Root, project: Project): CostCenter | undefined {
  return find(root, project.costCenterId);
}

/** The cost center one month's days are charged to, if any (and it still exists). */
export function chargedTo(root: Root, entry: TimesheetMonth): CostCenter | undefined {
  return find(root, entry.costCenterId);
}

/** One cost center's share of a month: its days and the projects they came from. Null: charged to none. */
export type CostCenterCharge = { costCenter: CostCenter | null; days: number; projects: { project: Project; days: number }[] };

/**
 * What a month's timesheet charges to each cost center, most days first, with
 * days charged to none last. Leave and holidays aren't charged, so they
 * aren't here.
 */
export function chargesIn(root: Root, month: string): CostCenterCharge[] {
  const byKey = new Map<string, CostCenterCharge>();
  for (const project of root.projects) {
    for (const entry of project.timesheet ?? []) {
      if (entry.month !== month) continue;
      const costCenter = chargedTo(root, entry) ?? null;
      const key = costCenter?.id ?? '';
      let charge = byKey.get(key);
      if (!charge) byKey.set(key, (charge = { costCenter, days: 0, projects: [] }));
      charge.days += entry.days;
      charge.projects.push({ project, days: entry.days });
    }
  }
  return [...byKey.values()].sort((a, b) => Number(!a.costCenter) - Number(!b.costCenter) || b.days - a.days);
}
