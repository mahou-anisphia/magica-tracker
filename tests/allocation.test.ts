import { describe, expect, it } from 'vitest';
import { setAllocationSettings, setProjectDone, setTaskDone } from '../src/core/ops';
import { currentPeriod, periodOf } from '../src/core/period';
import { allocation, allocationHistory, taskShare } from '../src/core/progress';
import { project, root, T1, task } from './fixtures';

// Tuesday 13 October 2026. Its week is 12–18 Oct; its fortnight 5–18 Oct.
const NOW = new Date(2026, 9, 13, 12, 0, 0);

describe('periods', () => {
  it('starts weeks on Monday and lines fortnights up from a fixed Monday', () => {
    expect(currentPeriod(NOW, 'week')).toEqual({ start: '2026-10-12', end: '2026-10-18' });
    expect(currentPeriod(NOW, 'fortnight')).toEqual({ start: '2026-10-05', end: '2026-10-18' });
    expect(periodOf('2026-10-19', 'fortnight')).toEqual({ start: '2026-10-19', end: '2026-11-01' });
    expect(periodOf('2024-01-01', 'fortnight')).toEqual({ start: '2024-01-01', end: '2024-01-14' });
    expect(periodOf('2026-10-11', 'week')).toEqual({ start: '2026-10-05', end: '2026-10-11' });
  });

  it('crosses a daylight-saving change without shifting a day', () => {
    expect(periodOf('2026-03-30', 'week')).toEqual({ start: '2026-03-30', end: '2026-04-05' });
    expect(periodOf('2026-10-25', 'week')).toEqual({ start: '2026-10-19', end: '2026-10-25' });
  });
});

describe('a task’s share of the period', () => {
  const fortnight = { start: '2026-10-12', end: '2026-10-25' };

  it('lands whole in the period its deadline falls in, and nowhere else', () => {
    expect(taskShare(task('t', { effort: 40, due: '2026-10-20' }), fortnight)).toBe(40);
    expect(taskShare(task('t', { effort: 40, due: '2026-10-30' }), fortnight)).toBe(0);
  });

  it('counts now when overdue or undated', () => {
    expect(taskShare(task('t', { effort: 40, due: '2026-10-01' }), fortnight)).toBe(40);
    expect(taskShare(task('t', { effort: 40 }), fortnight)).toBe(40);
  });

  it('spreads by day from a start date to the deadline', () => {
    // 6 Oct → 2 Nov is 28 days; 14 of them fall in this fortnight.
    expect(taskShare(task('t', { effort: 40, startsOn: '2026-10-06', due: '2026-11-02' }), fortnight)).toBe(20);
    // Starting in a later period leaves nothing here.
    expect(taskShare(task('t', { effort: 40, startsOn: '2026-10-26', due: '2026-11-02' }), fortnight)).toBe(0);
  });

  it('keeps a finished task where its deadline and start put it', () => {
    const done = (extra: Parameters<typeof task>[1]) => task('t', { effort: 40, done: true, ...extra });
    expect(taskShare(done({ due: '2026-10-20', doneAt: '2026-10-02T09:00:00Z' }), fortnight)).toBe(40);
    expect(taskShare(done({ due: '2026-10-30', doneAt: '2026-10-14T09:00:00Z' }), fortnight)).toBe(0);
    expect(taskShare(done({ startsOn: '2026-10-06', due: '2026-11-02', doneAt: '2026-10-14T09:00:00Z' }), fortnight)).toBe(20);
  });

  it('keeps finished late or undated work in the period it was finished in, once', () => {
    const before = { start: '2026-09-28', end: '2026-10-11' };
    const done = (extra: Parameters<typeof task>[1]) => task('t', { effort: 40, done: true, ...extra });
    // Due last fortnight, finished in this one: here, and not back there.
    const late = done({ due: '2026-10-01', doneAt: '2026-10-14T09:00:00Z' });
    expect(taskShare(late, fortnight)).toBe(40);
    expect(taskShare(late, before)).toBe(0);
    // Overdue but finished back then: not on your plate now.
    expect(taskShare(done({ due: '2026-10-01', doneAt: '2026-10-08T09:00:00Z' }), fortnight)).toBe(0);
    expect(taskShare(done({ doneAt: '2026-10-14T09:00:00Z' }), fortnight)).toBe(40);
    expect(taskShare(done({ doneAt: '2026-10-08T09:00:00Z' }), fortnight)).toBe(0);
  });

  it('ignores a start after the deadline', () => {
    expect(taskShare(task('t', { effort: 40, startsOn: '2026-11-10', due: '2026-10-20' }), fortnight)).toBe(40);
  });
});

describe('allocation', () => {
  it('adds this period’s shares, against the person’s own period and limit', () => {
    let r = root({
      projects: [
        project('p', {
          tasks: [
            task('now', { effort: 50, due: '2026-10-15' }),
            task('later', { effort: 50, due: '2026-10-22' }),
            task('early', { effort: 30, due: '2026-10-06' }),
            task('far', { effort: 50, due: '2026-11-20' }),
          ],
        }),
      ],
    });
    expect(allocation(r, NOW)).toMatchObject({ period: 'fortnight', maxLoad: 150, total: 80, tasks: 2 });
    r = setAllocationSettings(r, { period: 'week', maxLoad: 120 }, T1);
    // 6 Oct is overdue in a 12–18 Oct week, so it still counts.
    expect(allocation(r, NOW)).toMatchObject({ period: 'week', maxLoad: 120, total: 80, tasks: 2, range: { start: '2026-10-12', end: '2026-10-18' } });
  });

  it('does not drop when you finish a task, or archive its project', () => {
    const r = root({
      projects: [
        project('p', {
          tasks: [
            task('due', { effort: 50, due: '2026-10-15' }),
            task('late', { effort: 30, due: '2026-10-01' }),
            task('undated', { effort: 20 }),
            task('spread', { effort: 40, startsOn: '2026-10-05', due: '2026-11-01' }),
          ],
        }),
      ],
    });
    const before = allocation(r, NOW);
    expect(before).toMatchObject({ total: 120, tasks: 4, done: 0 });
    const doneAt = NOW.toISOString();
    let finished = r;
    for (const id of ['due', 'late', 'undated', 'spread']) finished = setTaskDone(finished, 'p', id, true, doneAt);
    expect(allocation(finished, NOW)).toMatchObject({ total: 120, tasks: 4, done: 4 });
    expect(allocation(setProjectDone(finished, 'p', true, doneAt), NOW).total).toBe(120);
    // A week later, still the same fortnight.
    expect(allocation(finished, new Date(2026, 9, 18, 12)).total).toBe(120);
    // The next fortnight: only the rest of the spread task, which was planned there.
    expect(allocation(finished, new Date(2026, 9, 20, 12)).total).toBe(20);
  });
});

describe('allocation history', () => {
  // NOW's fortnight is 5–18 Oct; the two before it are 21 Sep – 4 Oct and 7–20 Sep.
  const r = root({
    projects: [
      project('p', {
        tasks: [
          task('sep', { effort: 30, due: '2026-09-15', done: true, doneAt: '2026-09-14T09:00:00Z' }),
          // Due in the second, finished late in the third: counts there, once.
          task('late', { effort: 40, due: '2026-10-01', done: true, doneAt: '2026-10-06T09:00:00Z' }),
          // 14 days from 28 Sep: 7 in 21 Sep – 4 Oct, 7 in 5–18 Oct.
          task('spread', { effort: 20, startsOn: '2026-09-28', due: '2026-10-11' }),
          // Open and undated: on your plate now, not back then.
          task('undated', { effort: 10 }),
        ],
      }),
    ],
  });

  it('works out each past period from the tasks, oldest first, this one last', () => {
    const h = allocationHistory(r, NOW, 3);
    expect(h.map((a) => a.range.start)).toEqual(['2026-09-07', '2026-09-21', '2026-10-05']);
    expect(h.map((a) => a.total)).toEqual([30, 10, 60]);
    expect(h.map((a) => a.items.map((i) => (i.kind === 'task' ? i.task.id : i.entry.id)))).toEqual([['sep'], ['spread'], ['late', 'spread', 'undated']]);
    expect(h.at(-1)).toEqual(allocation(r, NOW));
  });

  it('leaves out the periods before anything was allocated', () => {
    expect(allocationHistory(r, NOW, 12).map((a) => a.range.start)).toEqual(['2026-09-07', '2026-09-21', '2026-10-05']);
    expect(allocationHistory(root(), NOW, 12)).toHaveLength(1);
  });

  it('follows the person’s own period', () => {
    const weekly = setAllocationSettings(r, { period: 'week' }, T1);
    expect(allocationHistory(weekly, NOW, 2).map((a) => a.range)).toEqual([
      { start: '2026-10-05', end: '2026-10-11' },
      { start: '2026-10-12', end: '2026-10-18' },
    ]);
  });
});
