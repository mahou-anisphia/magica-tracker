import { describe, expect, it } from 'vitest';
import { chargesIn, costCenterLabel, costCenterOf } from '../src/core/costCenters';
import { mergeRoots } from '../src/core/merge';
import { migrate } from '../src/core/migrate';
import {
  copyTimesheetMonth,
  createCostCenter,
  deleteCostCenter,
  setProjectCostCenter,
  setTimesheetDays,
  updateCostCenter,
} from '../src/core/ops';
import { addSample, hasSample, removeSample } from '../src/core/sample';
import { SCHEMA_VERSION } from '../src/core/schema';
import { parseRoot } from '../src/core/validate';
import { project, root, T0, T1, T2 } from './fixtures';

// 28 October 2026, as an instant: "this month" for a cost center change is October.
const OCT = '2026-10-28T09:00:00.000Z';

const withCenters = () => {
  let r = root({ projects: [project('p'), project('q')] });
  r = createCostCenter(r, 'a', { code: ' CC-4120 ', name: 'Research' }, T0);
  r = createCostCenter(r, 'b', { name: 'Operations' }, T0);
  return r;
};

describe('schema 7', () => {
  it('reads every v6 file as it is', () => {
    const v6 = { schemaVersion: 6, projects: [{ id: 'p', name: 'x', timesheet: [{ month: '2026-10', days: 2 }] }], backlog: [] };
    expect(migrate(v6)).toEqual({ ...v6, schemaVersion: SCHEMA_VERSION });
    expect(parseRoot(v6).ok).toBe(true);
  });

  it('wants a code or a name on a cost center, and ids shared with nothing else', () => {
    const file = (costCenters: object[], projects: object[] = []) => parseRoot({ schemaVersion: 7, costCenters, projects });
    expect(file([{ id: 'c', code: 'CC-1' }]).ok).toBe(true);
    expect(file([{ id: 'c', name: 'Research' }]).ok).toBe(true);
    expect(file([{ id: 'c', code: '  ' }]).ok).toBe(false);
    expect(file([{ id: 'x', code: 'CC-1' }], [{ id: 'x', name: 'P' }])).toEqual({
      ok: false,
      error: "Two items share the id “x”: project 'P' and cost center 'CC-1'.",
    });
  });

  it('merges cost centers by id, the newer copy winning', () => {
    const current = root({ costCenters: [{ id: 'a', code: 'mine', createdAt: T0, updatedAt: T2 }] });
    const incoming = root({ costCenters: [{ id: 'a', code: 'theirs', createdAt: T0, updatedAt: T1 }, { id: 'b', name: 'New', createdAt: T0, updatedAt: T0 }] });
    expect(mergeRoots(current, incoming).costCenters!.map((c) => c.code ?? c.name)).toEqual(['mine', 'New']);
  });
});

describe('cost centers', () => {
  it('are made with a code, a name or both, renamed, and labelled', () => {
    let r = withCenters();
    expect(r.costCenters!.map(costCenterLabel)).toEqual(['CC-4120 · Research', 'Operations']);
    expect(createCostCenter(r, 'c', { code: ' ', name: '' }, T0)).toBe(r);
    r = updateCostCenter(r, 'b', { code: 'CC-2210', name: 'Operations' }, T1);
    expect(r.costCenters![1]).toMatchObject({ code: 'CC-2210', updatedAt: T1 });
    expect(updateCostCenter(r, 'b', { code: '', name: '' }, T1)).toBe(r);
  });

  it('charge new days to the project’s cost center, and days already given keep theirs', () => {
    let r = withCenters();
    r = setTimesheetDays(r, 'p', '2026-09', 5, T0);
    r = setProjectCostCenter(r, 'p', 'a', OCT);
    expect(costCenterOf(r, r.projects[0]!)?.id).toBe('a');
    r = setTimesheetDays(r, 'p', '2026-10', 3, OCT);
    r = setTimesheetDays(r, 'p', '2026-11', 2, OCT);
    expect(r.projects[0]!.timesheet).toEqual([
      // Given before the project had a cost center, in a month already over: charged to none.
      { month: '2026-09', days: 5 },
      { month: '2026-10', days: 3, costCenterId: 'a' },
      { month: '2026-11', days: 2, costCenterId: 'a' },
    ]);
    // Moving to another: this month on follows, earlier months keep their charge.
    r = setProjectCostCenter(r, 'p', 'b', OCT);
    expect(r.projects[0]!.timesheet!.map((t) => t.costCenterId)).toEqual([undefined, 'b', 'b']);
    // Changing the days of a month doesn't change who it's charged to.
    r = setProjectCostCenter(r, 'p', undefined, OCT);
    r = setTimesheetDays(r, 'p', '2026-09', 6, OCT);
    expect(r.projects[0]!.timesheet![0]).toEqual({ month: '2026-09', days: 6 });
    expect(setProjectCostCenter(r, 'p', 'nope', OCT)).toBe(r);
  });

  it('keep the past when the project changes later', () => {
    let r = setProjectCostCenter(withCenters(), 'p', 'a', '2026-09-10T09:00:00.000Z');
    r = setTimesheetDays(r, 'p', '2026-09', 4, T0);
    r = setProjectCostCenter(r, 'p', 'b', OCT);
    r = setTimesheetDays(r, 'p', '2026-10', 3, OCT);
    expect(r.projects[0]!.timesheet!.map((t) => [t.month, t.costCenterId])).toEqual([
      ['2026-09', 'a'],
      ['2026-10', 'b'],
    ]);
    // Copying a month charges the copies to each project's cost center now.
    r = copyTimesheetMonth(setTimesheetDays(r, 'p', '2026-10', 0, OCT), '2026-09', '2026-10', OCT);
    expect(r.projects[0]!.timesheet!.map((t) => [t.month, t.costCenterId])).toEqual([
      ['2026-09', 'a'],
      ['2026-10', 'b'],
    ]);
  });

  it('add up a month by cost center, most days first, charged to none last', () => {
    let r = withCenters();
    r = setTimesheetDays(r, 'q', '2026-10', 2, OCT);
    r = setProjectCostCenter(r, 'p', 'a', OCT);
    r = setTimesheetDays(r, 'p', '2026-10', 9, OCT);
    expect(chargesIn(r, '2026-10').map((c) => [c.costCenter?.id ?? null, c.days, c.projects.map((x) => x.project.id)])).toEqual([
      ['a', 9, ['p']],
      [null, 2, ['q']],
    ]);
  });

  it('leave their projects and charges to none when deleted', () => {
    let r = setProjectCostCenter(withCenters(), 'p', 'a', OCT);
    r = setTimesheetDays(r, 'p', '2026-10', 3, OCT);
    r = deleteCostCenter(r, 'a', T2);
    expect(r.costCenters!.map((c) => c.id)).toEqual(['b']);
    expect('costCenterId' in r.projects[0]!).toBe(false);
    expect(r.projects[0]!.timesheet).toEqual([{ month: '2026-10', days: 3 }]);
  });

  it('come and go with the sample', () => {
    const now = new Date(2026, 9, 28, 12);
    const mine = createCostCenter(root(), 'mine', { code: 'CC-1' }, T0);
    const loaded = addSample(mine, now);
    expect(loaded.costCenters!.length).toBe(4);
    expect(hasSample(loaded)).toBe(true);
    // The sample's days are charged to its cost centers; one project has none.
    expect(chargesIn(loaded, '2026-10').map((c) => c.costCenter?.name ?? null)).toEqual(['Research', 'Operations', 'Lantern Festival grant', null]);
    expect(removeSample(loaded).costCenters).toEqual(mine.costCenters);
    expect(parseRoot(JSON.parse(JSON.stringify(loaded))).ok).toBe(true);
  });
});
