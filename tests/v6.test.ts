import { describe, expect, it } from 'vitest';
import { attention } from '../src/core/attention';
import { dueByDate } from '../src/core/calendar';
import { loadGroups } from '../src/core/domains';
import { mergeRoots } from '../src/core/merge';
import { migrate } from '../src/core/migrate';
import {
  addEntry,
  copyTimesheetMonth,
  deleteEntry,
  deleteProject,
  moveEntryToProject,
  setEntryDone,
  setTimesheetDays,
  setWorkdays,
  updateEntry,
} from '../src/core/ops';
import { allocation, isOver, isPastLimit } from '../src/core/progress';
import { workdaySettings, type CalendarEntry } from '../src/core/schema';
import { parseRoot } from '../src/core/validate';
import { addSample, hasSample, removeSample } from '../src/core/sample';
import {
  balanceLabel,
  capacityIn,
  daysOffOn,
  isoWeekday,
  monthBalance,
  shiftMonth,
  timesheetDays,
  timesheetFlags,
  workingDaysIn,
} from '../src/core/workdays';
import { getTask, project, root, T0, T1, T2, task } from './fixtures';

function entry(id: string, extra: Partial<CalendarEntry> & Pick<CalendarEntry, 'kind' | 'date'>): CalendarEntry {
  return { id, title: `Entry ${id}`, done: false, createdAt: T0, updatedAt: T0, ...extra };
}

// October 2026 has 22 weekdays. Monday 12 is a holiday; Thursday 22 and Friday 23 are leave.
const OCTOBER = [
  entry('h', { kind: 'holiday', date: '2026-10-12', title: 'Harvest Moon' }),
  entry('l', { kind: 'leave', date: '2026-10-22', until: '2026-10-23' }),
  // Leave over a weekend is no working day off.
  entry('w', { kind: 'leave', date: '2026-10-24', until: '2026-10-25' }),
];

describe('schema 6', () => {
  it('reads every v5 file as it is', () => {
    const v5 = { schemaVersion: 5, projects: [{ id: 'p', name: 'x' }], backlog: [] };
    expect(migrate(v5)).toEqual({ ...v5, schemaVersion: 6 });
    expect(parseRoot(v5).ok).toBe(true);
  });

  it('keeps time, allocation and done to events, and drops an end before the start', () => {
    const r = parseRoot({
      schemaVersion: 6,
      calendar: [
        { id: 'e', kind: 'event', title: 'Committee', date: '2026-10-29', time: '10:00', effort: 5, done: true },
        { id: 'l', kind: 'leave', title: 'Leave', date: '2026-10-22', until: '2026-10-21', time: '09:00', effort: 10, done: true },
      ],
    }, T1);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.root.calendar![0]).toMatchObject({ time: '10:00', effort: 5, done: true, doneAt: T1 });
    const leave = r.root.calendar![1]!;
    expect(leave.done).toBe(false);
    for (const key of ['until', 'time', 'effort', 'doneAt']) expect(key in leave).toBe(false);
  });

  it('rejects a bad time, a bad month, two entries for one month and a shared id', () => {
    const bad = (extra: object) => parseRoot({ schemaVersion: 6, ...extra });
    expect(bad({ calendar: [{ id: 'e', kind: 'event', title: 'X', date: '2026-10-29', time: '25:00' }] }).ok).toBe(false);
    expect(bad({ projects: [{ id: 'p', name: 'P', timesheet: [{ month: '2026-13', days: 2 }] }] }).ok).toBe(false);
    const twice = bad({ projects: [{ id: 'p', name: 'P', timesheet: [{ month: '2026-10', days: 2 }, { month: '2026-10', days: 3 }] }] });
    expect(twice).toEqual({ ok: false, error: "Project 'P' has two timesheet entries for 2026-10." });
    const shared = bad({ projects: [{ id: 'x', name: 'P' }], calendar: [{ id: 'x', kind: 'event', title: 'E', date: '2026-10-29' }] });
    expect(shared).toEqual({ ok: false, error: "Two items share the id “x”: project 'P' and event 'E'." });
  });

  it('merges calendar entries by id, the newer copy winning', () => {
    const current = root({ calendar: [entry('a', { kind: 'event', date: '2026-10-01', title: 'mine', updatedAt: T2 })] });
    const incoming = root({
      calendar: [entry('a', { kind: 'event', date: '2026-10-01', title: 'theirs', updatedAt: T1 }), entry('b', { kind: 'leave', date: '2026-10-02' })],
    });
    expect(mergeRoots(current, incoming).calendar!.map((e) => [e.id, e.title])).toEqual([
      ['a', 'mine'],
      ['b', 'Entry b'],
    ]);
  });
});

describe('calendar entries', () => {
  it('are added, changed, ticked and deleted; invalid input changes nothing', () => {
    let r = addEntry(root(), 'e', { kind: 'event', title: ' Committee ', date: '2026-10-29', time: '10:00', effort: 5 }, T0);
    expect(r.calendar).toEqual([
      { id: 'e', kind: 'event', title: 'Committee', date: '2026-10-29', time: '10:00', effort: 5, done: false, createdAt: T0, updatedAt: T0 },
    ]);
    expect(addEntry(r, 'x', { kind: 'event', title: '  ', date: '2026-10-29' }, T0)).toBe(r);
    expect(addEntry(r, 'x', { kind: 'event', title: 'X', date: '2026-02-30' }, T0)).toBe(r);
    r = setEntryDone(r, 'e', true, T1);
    expect(r.calendar![0]).toMatchObject({ done: true, doneAt: T1, updatedAt: T1 });
    r = updateEntry(r, 'e', { kind: 'event', title: 'Festival committee', date: '2026-10-30' }, T2);
    expect(r.calendar![0]).toMatchObject({ title: 'Festival committee', date: '2026-10-30', done: true, doneAt: T1, createdAt: T0 });
    expect('time' in r.calendar![0]!).toBe(false);
    r = addEntry(r, 'l', { kind: 'leave', title: 'Leave', date: '2026-10-22', until: '2026-10-23' }, T0);
    expect(setEntryDone(r, 'l', true, T1)).toBe(r);
    expect(deleteEntry(r, 'e').calendar!.map((e) => e.id)).toEqual(['l']);
  });

  it('move an event into a project as a task, its days as the start and deadline', () => {
    let r = root({ projects: [project('p')] });
    r = addEntry(r, 'e', { kind: 'event', title: 'Offsite', date: '2026-10-20', until: '2026-10-21', effort: 10, notes: 'Bring maps' }, T0);
    r = moveEntryToProject(r, 'e', 'p', T1);
    expect(r.calendar).toEqual([]);
    expect(getTask(r, 'p', 'e')).toMatchObject({ title: 'Offsite', startsOn: '2026-10-20', due: '2026-10-21', effort: 10, notes: 'Bring maps', status: 'todo' });
    expect(moveEntryToProject(r, 'nope', 'p', T1)).toBe(r);
  });
});

describe('timesheet', () => {
  it('gives a project whole days per month, in month order, zero removing it', () => {
    let r = root({ projects: [project('p')] });
    r = setTimesheetDays(r, 'p', '2026-10', 5, T1);
    r = setTimesheetDays(r, 'p', '2026-09', 6, T1);
    expect(r.projects[0]!.timesheet).toEqual([
      { month: '2026-09', days: 6 },
      { month: '2026-10', days: 5 },
    ]);
    expect(r.projects[0]!.updatedAt).toBe(T1);
    expect(setTimesheetDays(r, 'p', '2026-10', 1.5, T2)).toBe(r);
    expect(setTimesheetDays(r, 'p', '2026-10', 5, T2)).toBe(r);
    expect(timesheetDays(r.projects[0]!)).toBe(11);
    expect(timesheetDays(r.projects[0]!, '2026-10')).toBe(5);
    r = setTimesheetDays(setTimesheetDays(r, 'p', '2026-10', 0, T2), 'p', '2026-09', 0, T2);
    expect('timesheet' in r.projects[0]!).toBe(false);
  });

  it('copies one month’s split over another', () => {
    let r = root({ projects: [project('a', { timesheet: [{ month: '2026-09', days: 4 }] }), project('b', { timesheet: [{ month: '2026-10', days: 9 }] })] });
    r = copyTimesheetMonth(r, '2026-09', '2026-10', T1);
    expect(r.projects.map((p) => timesheetDays(p, '2026-10'))).toEqual([4, 0]);
  });

  it('balances a month: working weekdays from the start, filled by projects and days off', () => {
    let r = root({
      calendar: OCTOBER,
      projects: [project('a', { timesheet: [{ month: '2026-10', days: 10 }] }), project('b', { timesheet: [{ month: '2026-10', days: 7 }] })],
    });
    r = setWorkdays(r, { from: '2026-08-01' }, T0);
    expect(monthBalance(r, '2026-10')).toMatchObject({ target: 22, given: 17, leave: 2, holiday: 1, filled: 20, diff: -2, lastDay: '2026-10-30' });
    // Starting mid-month: only the days from then on are owed.
    r = setWorkdays(r, { from: '2026-10-15' }, T0);
    expect(monthBalance(r, '2026-10')).toMatchObject({ target: 12, leave: 2, holiday: 0 });
    // Worked weekdays decide the target and which days off count.
    r = setWorkdays(r, { from: '2026-08-01', weekdays: [1, 2, 3, 4] }, T0);
    expect(monthBalance(r, '2026-10')).toMatchObject({ target: 17, leave: 1, holiday: 1 });
    expect(balanceLabel(-2)).toBe('2 days short');
    expect(balanceLabel(1)).toBe('1 day over');
    expect(balanceLabel(0)).toBe('Balanced');
    // A month not over yet is still filling up.
    expect(balanceLabel(-2, '2026-10', new Date(2026, 9, 28))).toBe('2 days to go');
    expect(balanceLabel(-2, '2026-09', new Date(2026, 9, 28))).toBe('2 days short');
  });

  it('flags past months that don’t add up, and this one once over or near its end', () => {
    const base = setWorkdays(
      root({ projects: [project('a', { timesheet: [{ month: '2026-09', days: 22 }, { month: '2026-10', days: 18 }] })] }),
      { from: '2026-09-01' },
      T0,
    );
    expect(timesheetFlags(base, new Date(2026, 9, 13))).toEqual([]);
    expect(timesheetFlags(base, new Date(2026, 9, 28)).map((b) => [b.month, b.diff])).toEqual([['2026-10', -4]]);
    expect(timesheetFlags(base, new Date(2026, 10, 2)).map((b) => b.month)).toEqual(['2026-10']);
    const over = setTimesheetDays(base, 'a', '2026-10', 25, T1);
    expect(timesheetFlags(over, new Date(2026, 9, 13)).map((b) => [b.month, b.diff])).toEqual([['2026-10', 3]]);
    // No start date: no timesheet, no flags.
    expect(timesheetFlags(setWorkdays(base, { from: null }, T1), new Date(2026, 10, 2))).toEqual([]);
  });

  it('keeps the workday settings tidy', () => {
    let r = setWorkdays(root(), { weekdays: [5, 1, 1, 3] }, T0);
    expect(workdaySettings(r)).toEqual({ weekdays: [1, 3, 5] });
    expect(setWorkdays(r, { weekdays: [0] }, T0)).toBe(r);
    expect(setWorkdays(r, { from: '2026-13-01' }, T0)).toBe(r);
    r = setWorkdays(r, { from: '2026-09-01' }, T0);
    expect(workdaySettings(r)).toEqual({ from: '2026-09-01', weekdays: [1, 3, 5] });
    expect(workdaySettings(root())).toEqual({ weekdays: [1, 2, 3, 4, 5] });
  });

  it('goes with its project when the project is deleted', () => {
    const r = root({ projects: [project('a', { timesheet: [{ month: '2026-10', days: 5 }] })] });
    expect(monthBalance(deleteProject(r, 'a'), '2026-10').given).toBe(0);
  });

  it('counts weekdays from Monday', () => {
    expect(isoWeekday('2026-10-26')).toBe(1);
    expect(isoWeekday('2026-11-01')).toBe(7);
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
  });
});

describe('allocation with events and days off', () => {
  // Wednesday 28 October 2026. Its fortnight is 19 Oct – 1 Nov, with Thursday 22 and Friday 23 on leave.
  const NOW = new Date(2026, 9, 28, 12, 0, 0);

  it('lowers the period’s capacity and limit by its working days off', () => {
    expect(capacityIn(root({ calendar: OCTOBER }), { start: '2026-10-19', end: '2026-11-01' })).toEqual({ capacity: 80, daysOff: 2 });
    expect(capacityIn(root({ calendar: OCTOBER }), { start: '2026-10-26', end: '2026-11-01' })).toEqual({ capacity: 100, daysOff: 0 });
    const a = allocation(root({ calendar: OCTOBER, projects: [project('p', { tasks: [task('t', { effort: 90, due: '2026-10-30' })] })] }), NOW);
    expect(a).toMatchObject({ total: 90, capacity: 80, limit: 120, daysOff: 2 });
    expect(isOver(a)).toBe(true);
    expect(isPastLimit(a)).toBe(false);
  });

  it('counts events as tasks without a project, in their own group', () => {
    const r = root({
      calendar: [
        ...OCTOBER,
        entry('e', { kind: 'event', date: '2026-10-29', effort: 20 }),
        entry('late', { kind: 'event', date: '2026-10-01', effort: 10 }),
        entry('past', { kind: 'event', date: '2026-10-01', effort: 10, done: true, doneAt: '2026-10-01T09:00:00Z' }),
        entry('free', { kind: 'event', date: '2026-10-29' }),
      ],
      projects: [project('p', { tasks: [task('t', { effort: 40, due: '2026-10-30' })] })],
    });
    const a = allocation(r, NOW);
    expect(a).toMatchObject({ total: 70, tasks: 1, events: 2 });
    expect(loadGroups(r, a.items).map((g) => [g.key, g.kind, g.share, g.items.length])).toEqual([
      ['project:p', 'project', 40, 1],
      ['events', 'events', 30, 2],
    ]);
  });
});

describe('on the calendar', () => {
  const NOW = new Date(2026, 9, 28, 12, 0, 0);

  it('shows an event on each of its days, after deadlines of higher priority, timed ones in order', () => {
    const r = root({
      calendar: [
        entry('late', { kind: 'event', date: '2026-10-29', time: '16:00' }),
        entry('early', { kind: 'event', date: '2026-10-29', time: '09:00' }),
        entry('fair', { kind: 'event', date: '2026-10-29', until: '2026-10-30' }),
        ...OCTOBER,
      ],
      projects: [project('p', { tasks: [task('t', { due: '2026-10-29', priority: 'high' })] })],
    });
    const byDate = dueByDate(r, NOW);
    expect(byDate.get('2026-10-29')!.map((it) => (it.kind === 'event' ? it.entry.id : it.task?.id))).toEqual(['t', 'fair', 'early', 'late']);
    expect(byDate.get('2026-10-30')!.map((it) => it.title)).toEqual(['Entry fair']);
    // Days off aren't items; they are marked apart.
    expect(byDate.has('2026-10-12')).toBe(false);
    expect(daysOffOn(r, '2026-10-23').map((e) => e.id)).toEqual(['l']);
    expect(workingDaysIn(r, '2026-10-22', '2026-10-26')).toBe(3);
  });

  it('turns an unfinished event past its last day to the highlight and lists it in Needs attention', () => {
    const r = root({
      calendar: [
        entry('late', { kind: 'event', date: '2026-10-20' }),
        entry('done', { kind: 'event', date: '2026-10-20', done: true, doneAt: T1 }),
        entry('running', { kind: 'event', date: '2026-10-26', until: '2026-10-29' }),
      ],
    });
    expect(dueByDate(r, NOW).get('2026-10-20')!.map((it) => [it.title, it.watch])).toEqual([
      ['Entry late', true],
      ['Entry done', false],
    ]);
    expect(attention(r, NOW).events.map((x) => [x.entry.id, x.days])).toEqual([['late', -8]]);
  });

  it('wipes sample entries with the rest of the sample, keeping your own', () => {
    const mine = entry('mine', { kind: 'leave', date: '2026-10-22' });
    const withSample = addSample(root({ calendar: [mine] }), NOW);
    expect(withSample.calendar!.length).toBeGreaterThan(1);
    expect(hasSample(withSample)).toBe(true);
    expect(removeSample(withSample).calendar).toEqual([mine]);
    // The sample timesheet: last month adds up, this month is two days short.
    const tracked = setWorkdays(addSample(root(), NOW), { from: '2026-09-01' }, T0);
    expect(monthBalance(tracked, '2026-09').diff).toBe(0);
    expect(monthBalance(tracked, '2026-10').diff).toBe(-2);
    expect(parseRoot(JSON.parse(JSON.stringify(withSample))).ok).toBe(true);
  });
});
