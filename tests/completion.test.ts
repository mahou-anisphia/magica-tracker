import { describe, expect, it } from 'vitest';
import { normalizeRoot, normalizeTask, subtaskProgress } from '../src/core/completion';
import { addSubtask, deleteSubtask, setSubtaskDone, setTaskDone } from '../src/core/ops';
import { parseRoot } from '../src/core/validate';
import { T0, T1, T2, getTask, project, root, subtask, task } from './fixtures';

const withTask = (t: ReturnType<typeof task>) => root({ projects: [project('p', { tasks: [t] })] });

describe('completion rule', () => {
  it('ticking the last sub-task completes the parent', () => {
    let r = withTask(task('t', { subtasks: [subtask('a', true), subtask('b')] }));
    r = setSubtaskDone(r, 'p', 't', 'b', true, T1);
    const t = getTask(r, 'p', 't');
    expect(t.done).toBe(true);
    expect(t.doneAt).toBe(T1);
  });

  it('unticking any sub-task reopens the parent and clears doneAt', () => {
    let r = withTask(task('t', { subtasks: [subtask('a', true), subtask('b', true)] }));
    r = normalizeRoot(r, T0);
    expect(getTask(r, 'p', 't').done).toBe(true);
    r = setSubtaskDone(r, 'p', 't', 'a', false, T1);
    const t = getTask(r, 'p', 't');
    expect(t.done).toBe(false);
    expect('doneAt' in t).toBe(false);
  });

  it('adding a sub-task to a done task reopens it', () => {
    let r = normalizeRoot(withTask(task('t', { subtasks: [subtask('a', true)] })), T0);
    expect(getTask(r, 'p', 't').done).toBe(true);
    r = addSubtask(r, 'p', 't', 'b', 'New step', T1);
    expect(getTask(r, 'p', 't').done).toBe(false);
  });

  it('deleting the only open sub-task completes the parent', () => {
    let r = withTask(task('t', { subtasks: [subtask('a', true), subtask('b')] }));
    r = deleteSubtask(r, 'p', 't', 'b', T1);
    expect(getTask(r, 'p', 't').done).toBe(true);
  });

  it('ticking a parent completes all its sub-tasks', () => {
    let r = withTask(task('t', { subtasks: [subtask('a'), subtask('b', true), subtask('c')] }));
    r = setTaskDone(r, 'p', 't', true, T1);
    const t = getTask(r, 'p', 't');
    expect(t.done).toBe(true);
    expect(t.subtasks.every((s) => s.done && s.doneAt)).toBe(true);
    // Already-done sub-tasks keep their original doneAt.
    expect(t.subtasks[1]!.doneAt).toBe(T0);
    expect(t.subtasks[0]!.doneAt).toBe(T1);
  });

  it('unticking a parent reopens all its sub-tasks', () => {
    let r = normalizeRoot(withTask(task('t', { subtasks: [subtask('a', true), subtask('b', true)] })), T0);
    r = setTaskDone(r, 'p', 't', false, T1);
    const t = getTask(r, 'p', 't');
    expect(t.done).toBe(false);
    expect(t.subtasks.some((s) => s.done)).toBe(false);
    expect(t.subtasks.some((s) => 'doneAt' in s)).toBe(false);
  });

  it('a task without sub-tasks toggles directly', () => {
    let r = withTask(task('t'));
    r = setTaskDone(r, 'p', 't', true, T1);
    expect(getTask(r, 'p', 't')).toMatchObject({ done: true, doneAt: T1 });
    r = setTaskDone(r, 'p', 't', false, T2);
    expect(getTask(r, 'p', 't').done).toBe(false);
    expect('doneAt' in getTask(r, 'p', 't')).toBe(false);
  });

  it('ticking a sub-task bumps the task updatedAt (resets staleness)', () => {
    let r = withTask(task('t', { subtasks: [subtask('a'), subtask('b')] }));
    r = setSubtaskDone(r, 'p', 't', 'a', true, T2);
    expect(getTask(r, 'p', 't').updatedAt).toBe(T2);
  });

  it('normalizing never touches updatedAt', () => {
    const t = task('t', { done: true, subtasks: [subtask('a')], updatedAt: T0 });
    expect(normalizeTask(t, T2).updatedAt).toBe(T0);
  });

  it('a stored done that contradicts the sub-tasks is corrected on load', () => {
    const raw = withTask(task('t', { done: true, doneAt: T0, subtasks: [subtask('a', true), subtask('b')] }));
    const parsed = parseRoot(JSON.parse(JSON.stringify(raw)), T2);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(getTask(parsed.root, 'p', 't').done).toBe(false);
    expect('doneAt' in getTask(parsed.root, 'p', 't')).toBe(false);
  });

  it('a stored not-done with every sub-task done is corrected to done', () => {
    const raw = withTask(task('t', { done: false, subtasks: [subtask('a', true)] }));
    const parsed = parseRoot(raw, T2);
    expect(parsed.ok && getTask(parsed.root, 'p', 't').done).toBe(true);
  });

  it('normalizing is idempotent', () => {
    const r = withTask(task('t', { subtasks: [subtask('a', true), subtask('b', true)] }));
    const once = normalizeRoot(r, T1);
    expect(normalizeRoot(once, T2)).toEqual(once);
  });

  it('reports progress', () => {
    expect(subtaskProgress(task('t', { subtasks: [subtask('a', true), subtask('b')] }))).toEqual({ done: 1, total: 2 });
  });
});
