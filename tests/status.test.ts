import { describe, expect, it } from 'vitest';
import { normalizeRoot } from '../src/core/completion';
import { addTask, setSubtaskDone, setTaskDone, setTaskStatus } from '../src/core/ops';
import { stats } from '../src/core/progress';
import { parseRootText } from '../src/core/validate';
import { T0, T1, T2, getTask, project, root, subtask, task } from './fixtures';

const NOW = new Date(2026, 9, 13, 12);
const withSubs = () => root({ projects: [project('p', { tasks: [task('t', { subtasks: [subtask('a'), subtask('b')] })] })] });

describe('task status', () => {
  it('starts as To do, and a file without statuses reads as To do', () => {
    const r = addTask(root({ projects: [project('p')] }), 'p', 'n', 'New', T1);
    expect(getTask(r, 'p', 'n').status).toBe('todo');
    const parsed = parseRootText(JSON.stringify({ schemaVersion: 4, projects: [{ name: 'P', tasks: [{ title: 'T' }] }] }));
    expect(parsed.ok && parsed.root.projects[0]!.tasks[0]!.status).toBe('todo');
  });

  it('becomes Working when a sub-task is ticked, Done when the last is, and steps back when one is unticked', () => {
    let r = setSubtaskDone(withSubs(), 'p', 't', 'a', true, T1);
    expect(getTask(r, 'p', 't').status).toBe('working');
    r = setSubtaskDone(r, 'p', 't', 'b', true, T1);
    expect(getTask(r, 'p', 't')).toMatchObject({ done: true, status: 'done' });
    r = setSubtaskDone(r, 'p', 't', 'b', false, T2);
    expect(getTask(r, 'p', 't')).toMatchObject({ done: false, status: 'working' });
  });

  it('moves between columns: Done ticks, leaving Done reopens, Waiting keeps since when', () => {
    let r = setTaskStatus(withSubs(), 'p', 't', 'done', T1);
    expect(getTask(r, 'p', 't')).toMatchObject({ done: true, status: 'done' });
    expect(getTask(r, 'p', 't').subtasks.every((s) => s.done)).toBe(true);
    r = setTaskStatus(r, 'p', 't', 'waiting', T2);
    const t = getTask(r, 'p', 't');
    expect(t).toMatchObject({ done: false, status: 'waiting', waiting: { since: T2 } });
    expect(t.subtasks.some((s) => s.done)).toBe(false);
    expect(setTaskStatus(r, 'p', 't', 'waiting', T2)).toBe(r);
  });

  it('a task ticked and unticked by its checkbox is Done, then To do', () => {
    const r = root({ projects: [project('p', { tasks: [task('t', { status: 'working' })] })] });
    const done = setTaskDone(r, 'p', 't', true, T1);
    expect(getTask(done, 'p', 't').status).toBe('done');
    expect(getTask(setTaskDone(done, 'p', 't', false, T2), 'p', 't').status).toBe('todo');
  });

  it('normalising keeps done and status together, and waiting details only while waiting', () => {
    const r = root({
      projects: [
        project('p', {
          tasks: [
            task('a', { status: 'done' }), // says done, isn't: reopened
            task('b', { done: true, doneAt: T0, status: 'working' }), // is done
            task('c', { status: 'waiting' }), // waiting with no date: gets one
            task('d', { status: 'working', waiting: { since: T0 } }), // stray details go
          ],
        }),
      ],
    });
    const n = normalizeRoot(r, T1).projects[0]!.tasks;
    expect(n.map((t) => t.status)).toEqual(['todo', 'done', 'waiting', 'working']);
    expect(n[2]!.waiting).toEqual({ since: T1 });
    expect('waiting' in n[3]!).toBe(false);
    expect(normalizeRoot(normalizeRoot(r, T1), T2)).toEqual(normalizeRoot(r, T1));
  });

  it('counts Working as in progress and Waiting as waiting', () => {
    const r = root({
      projects: [project('p', { tasks: [task('w', { status: 'working' }), task('x', { status: 'waiting', waiting: { since: T0 } }), task('y')] })],
    });
    expect(stats(r, NOW)).toMatchObject({ open: 3, inProgress: 1, waiting: 1 });
  });
});
