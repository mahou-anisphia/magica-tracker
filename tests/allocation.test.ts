import { describe, expect, it } from 'vitest';
import { setAllocationSettings } from '../src/core/ops';
import { currentPeriod, periodOf } from '../src/core/period';
import { allocation, taskShare } from '../src/core/progress';
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
});
