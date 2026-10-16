import { describe, expect, it } from 'vitest';
import { byDomain, domainOf, loadGroups } from '../src/core/domains';
import { mergeRoots } from '../src/core/merge';
import { createDomain, deleteDomain, groupProjects, moveProject, renameDomain, setProjectDomain } from '../src/core/ops';
import { allocation } from '../src/core/progress';
import { addSample, hasSample, removeSample } from '../src/core/sample';
import { formatLoad, fromHours, periodHours, toHours } from '../src/core/units';
import { parseRoot } from '../src/core/validate';
import { project, root, T0, T1, T2, task } from './fixtures';

const NOW = new Date(2026, 9, 13, 12, 0, 0);

describe('allocation in hours', () => {
  it('makes 100% forty hours a week, eighty a fortnight', () => {
    expect(periodHours('week')).toBe(40);
    expect(periodHours('fortnight')).toBe(80);
    expect(toHours(105, 'fortnight')).toBe(84);
    expect(fromHours(10, 'fortnight')).toBe(12.5);
    expect(fromHours(7, 'fortnight')).toBe(8.75);
    expect(toHours(fromHours(7, 'fortnight'), 'fortnight')).toBe(7);
  });

  it('shows an amount either way, past 100% as past forty hours a week', () => {
    expect(formatLoad(105, 'week', 'percent')).toBe('105%');
    expect(formatLoad(12.5, 'week', 'percent')).toBe('12.5%');
    expect(formatLoad(105, 'week', 'hours')).toBe('42h');
    expect(formatLoad(12.5, 'fortnight', 'hours')).toBe('10h');
    expect(formatLoad(150, 'fortnight', 'hours')).toBe('120h');
  });

  it('adds fractions of a percent exactly', () => {
    const r = root({
      projects: [project('p', { tasks: [task('a', { effort: fromHours(10, 'fortnight') }), task('b', { effort: fromHours(7, 'fortnight') })] })],
    });
    expect(allocation(r, NOW).total).toBe(21.25);
  });
});

describe('domains', () => {
  const base = () =>
    root({ projects: [project('p1'), project('p2'), project('p3')] });

  it('are made, renamed, given projects and deleted, leaving the projects ungrouped', () => {
    let r = createDomain(base(), 'd', '  Sky  ', T0);
    expect(r.domains).toEqual([{ id: 'd', name: 'Sky', createdAt: T0, updatedAt: T0 }]);
    expect(createDomain(r, 'e', '   ', T0)).toBe(r);
    r = renameDomain(r, 'd', 'Sky and archive', T1);
    expect(r.domains![0]).toMatchObject({ name: 'Sky and archive', updatedAt: T1 });
    r = setProjectDomain(r, 'p2', 'd', T1);
    expect(domainOf(r, r.projects[1]!)?.name).toBe('Sky and archive');
    expect(r.projects[1]!.updatedAt).toBe(T1);
    expect(setProjectDomain(r, 'p1', 'nope', T1)).toBe(r);
    r = deleteDomain(r, 'd', T2);
    expect(r.domains).toEqual([]);
    expect('domainId' in r.projects[1]!).toBe(false);
    expect(r.projects[1]!.updatedAt).toBe(T2);
  });

  it('group things in domain order, ungrouped last, and one plain group without domains', () => {
    expect(byDomain(base(), base().projects, (p) => p)).toEqual([{ domain: null, items: base().projects }]);
    let r = createDomain(createDomain(base(), 'a', 'A', T0), 'b', 'B', T0);
    r = setProjectDomain(setProjectDomain(r, 'p1', 'b', T1), 'p3', 'a', T1);
    const groups = byDomain(r, r.projects, (p) => p);
    expect(groups.map((g) => [g.domain?.id ?? null, g.items.map((p) => p.id)])).toEqual([
      ['a', ['p3']],
      ['b', ['p1']],
      [null, ['p2']],
    ]);
    // A domain id that no longer exists counts as none.
    const orphan = { ...r, projects: [{ ...r.projects[0]!, domainId: 'gone' }] };
    expect(byDomain(orphan, orphan.projects, (p) => p).map((g) => g.domain)).toEqual([null]);
  });

  it('group what filled a period by domain, and a project with no domain on its own, largest first', () => {
    let r = root({
      projects: [
        project('p1', { tasks: [task('a', { effort: 20 })] }),
        project('p2', { tasks: [task('b', { effort: 30 })] }),
        project('p3', { tasks: [task('c', { effort: 40 })] }),
      ],
    });
    r = createDomain(r, 'd', 'Sky', T0);
    r = setProjectDomain(setProjectDomain(r, 'p1', 'd', T1), 'p2', 'd', T1);
    const groups = loadGroups(r, allocation(r, NOW).items);
    expect(groups.map((g) => [g.key, g.name, g.projects, g.share, g.items.map((i) => i.task.id)])).toEqual([
      ['domain:d', 'Sky', 2, 50, ['b', 'a']],
      ['project:p3', 'Project p3', 1, 40, ['c']],
    ]);
  });

  it('survive a merge and a round trip, and the sample takes its own away', () => {
    const mine = createDomain(base(), 'd', 'Sky', T0);
    const theirs = renameDomain(createDomain(root(), 'd', 'Old', T0), 'd', 'Sky and archive', T2);
    expect(mergeRoots(mine, theirs).domains).toEqual([{ id: 'd', name: 'Sky and archive', createdAt: T0, updatedAt: T2 }]);
    expect(mergeRoots(base(), base()).domains).toBeUndefined();
    const parsed = parseRoot(JSON.parse(JSON.stringify(setProjectDomain(mine, 'p1', 'd', T1))));
    expect(parsed.ok && parsed.root.projects[0]!.domainId).toBe('d');

    let r = setProjectDomain(mine, 'p1', 'd', T1);
    r = addSample(r, NOW);
    expect(r.domains!.length).toBeGreaterThan(1);
    // Your own project, moved into a sample domain, stays when the sample goes.
    r = setProjectDomain(r, 'p2', r.domains![1]!.id, T1);
    const wiped = removeSample(r);
    expect(hasSample(wiped)).toBe(false);
    expect(wiped.domains).toEqual(mine.domains);
    expect(wiped.projects.map((p) => [p.id, p.domainId])).toEqual([
      ['p1', 'd'],
      ['p2', undefined],
      ['p3', undefined],
    ]);
  });

  it('move a project by dragging: into a domain or out, before another or at the end of its group', () => {
    let r = createDomain(root({ projects: [project('a'), project('b'), project('c'), project('d')] }), 'x', 'X', T0);
    r = setProjectDomain(r, 'a', 'x', T0);
    const order = (x: typeof r) => x.projects.map((p) => `${p.id}${p.domainId ? ':' + p.domainId : ''}`);
    // To the end of X: just after a, its last project.
    r = moveProject(r, 'd', 'x', null, T1);
    expect(order(r)).toEqual(['a:x', 'd:x', 'b', 'c']);
    expect(r.projects[1]!.updatedAt).toBe(T1);
    // Before a, still in X.
    r = moveProject(r, 'd', 'x', 'a', T2);
    expect(order(r)).toEqual(['d:x', 'a:x', 'b', 'c']);
    // Out of X, to the end of the uncategorized.
    r = moveProject(r, 'a', undefined, null, T2);
    expect(order(r)).toEqual(['d:x', 'b', 'c', 'a']);
    // Where it already is: nothing changes.
    expect(moveProject(r, 'b', undefined, 'c', T2)).toBe(r);
    expect(moveProject(r, 'b', 'nope', null, T2)).toBe(r);
  });

  it('group two projects dropped on each other into a new domain, the dropped one after the other', () => {
    const r = groupProjects(root({ projects: [project('a'), project('b'), project('c')] }), 'g', 'New domain', 'a', 'c', T1);
    expect(r.domains).toEqual([{ id: 'g', name: 'New domain', createdAt: T1, updatedAt: T1 }]);
    expect(r.projects.map((p) => [p.id, p.domainId])).toEqual([
      ['a', 'g'],
      ['c', 'g'],
      ['b', undefined],
    ]);
    const s2 = root({ projects: [project('a'), project('b')] });
    expect(groupProjects(s2, 'g', 'N', 'a', 'a', T1)).toBe(s2);
  });
});
