import { describe, expect, it } from 'vitest';
import { parseRoot, parseRootText } from '../src/core/validate';
import { T0, project, root, subtask, task } from './fixtures';

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));

function errorOf(raw: unknown): string {
  const r = parseRoot(raw, T0);
  if (r.ok) throw new Error('expected a validation error');
  return r.error;
}

describe('validation', () => {
  it('accepts a valid root unchanged', () => {
    const r = root({ projects: [project('p', { tasks: [task('t', { subtasks: [subtask('s')] })] })] });
    const parsed = parseRoot(clone(r), T0);
    expect(parsed).toEqual({ ok: true, root: r });
  });

  it('rejects text that is not JSON', () => {
    expect(parseRootText('{ nope')).toEqual({ ok: false, error: "This file isn't valid JSON." });
  });

  it('rejects files without a schemaVersion', () => {
    expect(errorOf({ projects: [] })).toMatch(/no schemaVersion/);
    expect(errorOf([])).toMatch(/doesn't look like/);
  });

  it('names the task that is missing a title', () => {
    const raw = clone(root({ projects: [project('p', { name: 'Aegis', tasks: [task('t')] })] })) as any;
    delete raw.projects[0].tasks[0].title;
    expect(errorOf(raw)).toBe("Task #1 in project 'Aegis' is missing a title.");
  });

  it('names a sub-task with an empty title by its parent', () => {
    const raw = clone(
      root({ projects: [project('p', { name: 'Aegis', tasks: [task('t', { title: 'Write threat model', subtasks: [subtask('s', false, { title: '  ' })] })] })] }),
    );
    expect(errorOf(raw)).toBe("Sub-task #1 in task 'Write threat model' in project 'Aegis' has an empty title.");
  });

  it('rejects invalid and unsafe URLs', () => {
    const withUrl = (url: string) =>
      clone(root({ projects: [project('p', { name: 'Aegis', resources: [{ id: 'r', header: 'Spec', url, addedAt: T0 }] })] }));
    expect(errorOf(withUrl('not a url'))).toBe("Resource 'Spec' in project 'Aegis' has an invalid URL (“not a url”).");
    expect(errorOf(withUrl('javascript:alert(1)'))).toMatch(/invalid URL/);
    expect(parseRoot(withUrl('https://docs.example.com/x'), T0).ok).toBe(true);
  });

  it('rejects wrong types', () => {
    const raw = clone(root({ projects: [project('p', { name: 'Aegis', tasks: [task('t', { title: 'X' })] })] })) as any;
    raw.projects[0].tasks[0].done = 'yes';
    expect(errorOf(raw)).toMatch(/^Task 'X' in project 'Aegis' has an invalid “done”/);
  });

  it('rejects duplicate ids', () => {
    const raw = clone(root({ projects: [project('p', { name: 'A', tasks: [task('same', { title: 'One' }), task('same', { title: 'Two' })] })] }));
    expect(errorOf(raw)).toBe("Two items share the id “same”: task 'One' and task 'Two'.");
  });

  it('gives items without ids fresh ones, and fills missing arrays and timestamps', () => {
    const parsed = parseRoot({ schemaVersion: 1, projects: [{ name: 'Hand-written', tasks: [{ title: 'Do it' }] }] }, T0);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const p = parsed.root.projects[0]!;
    expect(p.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(p.tasks[0]!.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(p.tasks[0]).toMatchObject({ done: false, subtasks: [], resources: [] });
    expect(parsed.root.backlog).toEqual([]);
  });

  it('drops exportedAt and other unknown top-level keys', () => {
    const parsed = parseRoot({ ...clone(root()), exportedAt: T0, extra: 1 }, T0);
    expect(parsed).toEqual({ ok: true, root: root() });
  });
});
