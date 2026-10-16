import { describe, expect, it } from 'vitest';
import { attention } from '../src/core/attention';
import { dueByDate } from '../src/core/calendar';
import { exportJson } from '../src/core/exportFile';
import {
  setAllocationSettings,
  setOwnerName,
  setProjectText,
  setTaskEscalation,
  setTaskEscalationDetail,
  setTaskStart,
  setTaskStatus,
  setTaskText,
  setTaskWaitingOn,
} from '../src/core/ops';
import { stats } from '../src/core/progress';
import { allocationSettings, SCHEMA_VERSION } from '../src/core/schema';
import { parseRootText } from '../src/core/validate';
import { T0, T1, T2, getTask, project, root, task } from './fixtures';

const NOW = new Date(2026, 8, 28, 12, 0, 0);
const base = () => root({ projects: [project('p', { tasks: [task('t')] })] });

describe('schema v3', () => {
  it('loads a v2 file with nothing invented but a To do status', () => {
    const v2 = { schemaVersion: 2, updatedAt: T0, projects: [project('p', { tasks: [task('t', { priority: 'high' })] })], backlog: [] };
    const r = parseRootText(JSON.stringify(v2));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.root.schemaVersion).toBe(SCHEMA_VERSION);
    const t = r.root.projects[0]!.tasks[0]!;
    for (const key of ['startsOn', 'definitionOfDone', 'relatedPeople', 'waiting', 'escalation']) expect(key in t).toBe(false);
    expect(t.status).toBe('todo');
    expect('owner' in r.root).toBe(false);
    expect('settings' in r.root).toBe(false);
  });

  it('round-trips every new field through export and import', () => {
    let r = base();
    r = setTaskStart(r, 'p', 't', '2026-10-01', T1);
    r = setTaskText(r, 'p', 't', 'definitionOfDone', 'Reads true twice', T1);
    r = setTaskText(r, 'p', 't', 'relatedPeople', 'Bram; the lens maker', T1);
    r = setTaskStatus(r, 'p', 't', 'waiting', T1);
    r = setTaskWaitingOn(r, 'p', 't', 'The lens', T1);
    r = setTaskEscalation(r, 'p', 't', true, T1);
    r = setTaskEscalationDetail(r, 'p', 't', 'by', 'Archive team', T1);
    r = setProjectText(r, 'p', 'definitionOfDone', 'Survey shipped', T1);
    r = setOwnerName(r, 'Mira', () => 'owner-1', T1);
    r = setAllocationSettings(r, { period: 'week', maxLoad: 120 }, T1);
    expect(parseRootText(exportJson(r, T2))).toStrictEqual({ ok: true, root: r });
  });
});

describe('v3 ops', () => {
  it('waits with a date, keeps it on repeat, and forgets what it waited on when it moves on', () => {
    let r = setTaskStatus(base(), 'p', 't', 'waiting', T1);
    expect(getTask(r, 'p', 't').waiting).toEqual({ since: T1 });
    r = setTaskWaitingOn(r, 'p', 't', 'The lens', T2);
    r = setTaskStatus(r, 'p', 't', 'waiting', T2);
    expect(getTask(r, 'p', 't').waiting).toEqual({ since: T1, on: 'The lens' });
    r = setTaskStatus(r, 'p', 't', 'working', T2);
    expect(getTask(r, 'p', 't').status).toBe('working');
    expect('waiting' in getTask(r, 'p', 't')).toBe(false);
  });

  it('ignores a blocker or escalation detail when the flag is not set', () => {
    const r = base();
    expect(getTask(setTaskWaitingOn(r, 'p', 't', 'x', T1), 'p', 't').waiting).toBeUndefined();
    expect(getTask(setTaskEscalationDetail(r, 'p', 't', 'why', 'x', T1), 'p', 't').escalation).toBeUndefined();
  });

  it('clears free text when emptied', () => {
    let r = setTaskText(base(), 'p', 't', 'relatedPeople', 'Bram', T1);
    r = setTaskText(r, 'p', 't', 'relatedPeople', '  ', T2);
    expect('relatedPeople' in getTask(r, 'p', 't')).toBe(false);
  });

  it('keeps the owner id across renames and removes the owner when the name is emptied', () => {
    let r = setOwnerName(base(), 'Mira', () => 'id-1', T1);
    r = setOwnerName(r, 'Mira K', () => 'id-2', T2);
    expect(r.owner).toEqual({ id: 'id-1', name: 'Mira K' });
    expect('owner' in setOwnerName(r, '', () => 'id-3', T2)).toBe(false);
  });

  it('validates allocation settings and fills in defaults', () => {
    expect(allocationSettings(base())).toEqual({ period: 'fortnight', maxLoad: 150, unit: 'percent' });
    const r = setAllocationSettings(base(), { maxLoad: 120 }, T1);
    expect(allocationSettings(r)).toEqual({ period: 'fortnight', maxLoad: 120, unit: 'percent' });
    expect(setAllocationSettings(r, { maxLoad: 90 }, T2)).toBe(r);
    expect(setAllocationSettings(r, { maxLoad: 125.5 }, T2)).toBe(r);
    expect(allocationSettings(setAllocationSettings(r, { unit: 'hours' }, T2)).unit).toBe('hours');
  });
});

describe('waiting and urgent in the views', () => {
  it('lists a waiting task once, as waiting, ahead of urgent and stale', () => {
    const r = root({
      projects: [
        project('p', {
          tasks: [
            task('b', { priority: 'urgent', status: 'waiting', waiting: { since: '2026-09-25T12:00:00.000Z' } }),
            task('u', { priority: 'urgent', updatedAt: '2026-09-27T12:00:00.000Z' }),
          ],
        }),
      ],
    });
    const a = attention(r, NOW);
    expect(a.waiting.map((x) => [x.task.id, x.days])).toEqual([['b', 3]]);
    expect(a.urgent.map((x) => x.task.id)).toEqual(['u']);
    expect(a.stale.map((x) => x.task.id)).toEqual([]);
    expect(stats(r, NOW)).toMatchObject({ waiting: 1, urgent: 2 });
  });

  it('marks urgent task deadlines, not their sub-tasks or projects', () => {
    const r = root({
      projects: [
        project('p', {
          due: '2026-10-05',
          tasks: [
            task('u', { priority: 'urgent', due: '2026-10-05', subtasks: [{ id: 's', title: 'S', done: false, due: '2026-10-05' }] }),
            task('d', { priority: 'urgent', due: '2026-10-05', done: true, doneAt: T1 }),
          ],
        }),
      ],
    });
    const items = dueByDate(r, NOW).get('2026-10-05')!;
    expect(items.map((i) => [i.title, i.urgent])).toEqual([
      ['Project p', false],
      ['Task u', true],
      ['S', false],
      ['Task d', false],
    ]);
  });
});
