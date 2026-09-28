import { describe, expect, it } from 'vitest';
import { attention } from '../src/core/attention';
import { dueByDate, monthGrid } from '../src/core/calendar';
import { daysUntil, DUE_SOON_DAYS, dueDistance, dueLabel, isCalendarDate, isDueSoon } from '../src/core/due';
import { demote, setProjectDue, setSubtaskDone, setSubtaskDue, setTaskDue } from '../src/core/ops';
import { headerFromUrl, parseResourceInput } from '../src/core/url';
import { parseRoot } from '../src/core/validate';
import { T0, T1, getTask, project, root, subtask, task } from './fixtures';

// Local noon on Mon 28 Sep 2026.
const NOW = new Date(2026, 8, 28, 12, 0, 0);

describe('due dates', () => {
  it('accepts only real calendar days', () => {
    expect(isCalendarDate('2026-10-03')).toBe(true);
    expect(isCalendarDate('2026-02-30')).toBe(false);
    expect(isCalendarDate('2026-10-03T00:00:00Z')).toBe(false);
    expect(isCalendarDate('3 Oct')).toBe(false);
  });

  it('counts calendar days in local time', () => {
    expect(daysUntil('2026-09-28', NOW)).toBe(0);
    expect(daysUntil('2026-09-29', NOW)).toBe(1);
    expect(daysUntil('2026-09-25', NOW)).toBe(-3);
    // Across the end of daylight saving in many zones.
    expect(daysUntil('2026-11-02', NOW)).toBe(35);
  });

  it('is approaching within 3 days, and never when done', () => {
    expect(DUE_SOON_DAYS).toBe(3);
    expect(isDueSoon('2026-10-01', false, NOW)).toBe(true);
    expect(isDueSoon('2026-10-02', false, NOW)).toBe(false);
    expect(isDueSoon('2026-09-01', false, NOW)).toBe(true);
    expect(isDueSoon('2026-09-01', true, NOW)).toBe(false);
    expect(isDueSoon(undefined, false, NOW)).toBe(false);
  });

  it('reads naturally', () => {
    expect(dueLabel('2026-09-28', NOW, 'en-US')).toBe('Today');
    expect(dueLabel('2026-09-29', NOW, 'en-US')).toBe('Tomorrow');
    expect(dueLabel('2026-10-03', NOW, 'en-US')).toBe('Oct 3');
    expect(dueLabel('2027-01-05', NOW, 'en-US')).toBe('Jan 5, 2027');
    expect(dueDistance(-1)).toBe('overdue 1 day');
    expect(dueDistance(-4)).toBe('overdue 4 days');
    expect(dueDistance(0)).toBe('due today');
    expect(dueDistance(3)).toBe('due in 3 days');
  });

  it('sets and clears due dates on tasks and sub-tasks, bumping updatedAt', () => {
    let r = root({ projects: [project('p', { tasks: [task('t', { subtasks: [subtask('s')] })] })] });
    r = setTaskDue(r, 'p', 't', '2026-10-03', T1);
    r = setSubtaskDue(r, 'p', 't', 's', '2026-10-01', T1);
    expect(getTask(r, 'p', 't')).toMatchObject({ due: '2026-10-03', updatedAt: T1 });
    expect(getTask(r, 'p', 't').subtasks[0]!.due).toBe('2026-10-01');
    r = setTaskDue(r, 'p', 't', undefined, T1);
    r = setSubtaskDue(r, 'p', 't', 's', '', T1);
    expect('due' in getTask(r, 'p', 't')).toBe(false);
    expect('due' in getTask(r, 'p', 't').subtasks[0]!).toBe(false);
  });

  it('ignores an invalid date', () => {
    const r = root({ projects: [project('p', { tasks: [task('t')] })] });
    expect(setTaskDue(r, 'p', 't', 'soon', T1)).toBe(r);
  });

  it('validates due dates on import', () => {
    const bad = root({ projects: [project('p', { name: 'Aegis', tasks: [task('t', { title: 'X', due: '2026-13-01' })] })] });
    const r = parseRoot(JSON.parse(JSON.stringify(bad)), T0);
    expect(r.ok ? '' : r.error).toBe("Task 'X' in project 'Aegis' has an invalid date in “due” (“2026-13-01”).");
  });

  it('demoting drops the due date with the rest', () => {
    const r = demote(root({ projects: [project('p', { tasks: [task('t', { due: '2026-10-01' })] })] }), 'p', 't', T1);
    expect('due' in r.backlog[0]!).toBe(false);
  });
});

describe('attention: deadlines', () => {
  const r = root({
    projects: [
      project('p', {
        tasks: [
          task('later', { due: '2026-10-09', updatedAt: T0 }), // far off, but stale
          task('soon', { due: '2026-09-30', updatedAt: T0 }), // due soon and stale: listed once, as due
          task('parent', {
            updatedAt: new Date(2026, 8, 27).toISOString(),
            subtasks: [subtask('late', false, { due: '2026-09-26' }), subtask('finished', true, { due: '2026-09-20' })],
          }),
        ],
      }),
      project('gone', { archived: true, tasks: [task('hidden', { due: '2026-09-28' })] }),
    ],
  });

  it('lists approaching and overdue tasks and sub-tasks, most urgent first', () => {
    const a = attention(r, NOW);
    expect(a.due.map((d) => [d.subtask?.id ?? d.task?.id, d.days])).toEqual([
      ['late', -2],
      ['soon', 2],
    ]);
  });

  it('does not repeat a due task under stale', () => {
    expect(attention(r, NOW).stale.map((s) => s.task.id)).toEqual(['later']);
  });

  it('drops a sub-task once it is done', () => {
    const done = setSubtaskDone(r, 'p', 'parent', 'late', true, T1);
    expect(attention(done, NOW).due.map((d) => d.task?.id)).toEqual(['soon']);
  });
});

describe('project deadlines', () => {
  it('sets and clears a project deadline', () => {
    let r = root({ projects: [project('p')] });
    r = setProjectDue(r, 'p', '2026-10-01', T1);
    expect(r.projects[0]).toMatchObject({ due: '2026-10-01', updatedAt: T1 });
    r = setProjectDue(r, 'p', undefined, T1);
    expect('due' in r.projects[0]!).toBe(false);
  });

  it('an approaching project deadline needs attention until every task is done', () => {
    const open = root({ projects: [project('p', { due: '2026-09-30', tasks: [task('t')] })] });
    expect(attention(open, NOW).due).toMatchObject([{ project: { id: 'p' }, days: 2 }]);
    expect(attention(open, NOW).due[0]!.task).toBeUndefined();
    const finished = root({ projects: [project('p', { due: '2026-09-30', tasks: [task('t', { done: true, doneAt: T0 })] })] });
    expect(attention(finished, NOW).due).toEqual([]);
    // No tasks yet is not "finished".
    expect(attention(root({ projects: [project('p', { due: '2026-09-28' })] }), NOW).due).toHaveLength(1);
  });

  it('shows on the calendar before its tasks', () => {
    const r = root({ projects: [project('p', { name: 'Aegis', due: '2026-10-01', tasks: [task('t', { due: '2026-10-01' })] })] });
    expect(dueByDate(r, NOW).get('2026-10-01')!.map((i) => i.title)).toEqual(['Aegis', 'Task t']);
  });
});

describe('calendar', () => {
  it('builds Monday-first weeks with spill-over days', () => {
    const april = monthGrid(2026, 3);
    expect(april).toHaveLength(5);
    expect(april[0]![0]).toEqual({ date: '2026-03-30', day: 30, inMonth: false });
    expect(april[0]![2]).toEqual({ date: '2026-04-01', day: 1, inMonth: true });
    expect(april[4]![6]).toEqual({ date: '2026-05-03', day: 3, inMonth: false });
  });

  it('uses 4 to 6 weeks as needed', () => {
    expect(monthGrid(2027, 1)).toHaveLength(4); // Feb 2027 starts on a Monday
    expect(monthGrid(2026, 2)).toHaveLength(6); // Mar 2026 starts on a Sunday
  });

  it('groups due items by day, unfinished and tasks first, skipping archived projects', () => {
    const r = root({
      projects: [
        project('p', {
          tasks: [
            task('a', { due: '2026-10-01', done: true, doneAt: T0 }),
            task('b', { due: '2026-10-01', subtasks: [subtask('s', false, { due: '2026-10-01' })] }),
          ],
        }),
        project('x', { archived: true, tasks: [task('hidden', { due: '2026-10-01' })] }),
      ],
    });
    const items = dueByDate(r, NOW).get('2026-10-01')!;
    expect(items.map((i) => [i.title, i.done, i.watch])).toEqual([
      ['Task b', false, true],
      ['Sub s', false, true],
      ['Task a', true, false],
    ]);
  });
});

describe('one-line resource input', () => {
  it('splits a header from a link anywhere in the line', () => {
    expect(parseResourceInput('Threat model v2 https://docs.example.com/tm')).toEqual({
      header: 'Threat model v2',
      url: 'https://docs.example.com/tm',
    });
    expect(parseResourceInput('https://docs.example.com/tm — Threat model')).toEqual({
      header: 'Threat model',
      url: 'https://docs.example.com/tm',
    });
    expect(parseResourceInput('Runbook: docs.example.com/runbook')).toEqual({
      header: 'Runbook',
      url: 'https://docs.example.com/runbook',
    });
  });

  it('does not mistake version numbers for links', () => {
    expect(parseResourceInput('Spec v2.1 wiki.example.org/spec')?.header).toBe('Spec v2.1');
    expect(parseResourceInput('Spec v2.1')).toBeNull();
  });

  it('makes a header from a bare link', () => {
    expect(parseResourceInput('https://docs.example.com/aegis/threat-model-v2.pdf')).toEqual({
      header: 'Threat model v2',
      url: 'https://docs.example.com/aegis/threat-model-v2.pdf',
    });
    expect(headerFromUrl('https://www.example.com/')).toBe('example.com');
  });

  it('refuses unsafe links', () => {
    expect(parseResourceInput('Click me javascript:alert(1)')).toBeNull();
  });
});
