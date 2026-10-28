import { describe, expect, it } from 'vitest';
import { MigrationError, migrate } from '../src/core/migrate';

describe('migrate', () => {
  it('passes current-version data through', () => {
    const raw = { schemaVersion: 6, projects: [], backlog: [] };
    expect(migrate(raw)).toEqual(raw);
  });

  it('upgrades v1 and v2 without changing anything but the version when there are no tasks', () => {
    const v1 = { schemaVersion: 1, projects: [{ id: 'p', name: 'x' }], backlog: [] };
    expect(migrate(v1)).toEqual({ ...v1, schemaVersion: 6 });
    const v2 = { schemaVersion: 2, projects: [{ id: 'p', name: 'x', due: '2026-10-01' }], backlog: [] };
    expect(migrate(v2)).toEqual({ ...v2, schemaVersion: 6 });
  });

  it('gives v3 tasks a status from what they say, and turns blocked into waiting', () => {
    const since = '2026-10-01T09:00:00.000Z';
    const v3 = {
      schemaVersion: 3,
      projects: [
        {
          id: 'p',
          name: 'x',
          tasks: [
            { id: 'a', title: 'A' },
            { id: 'b', title: 'B', done: true },
            { id: 'c', title: 'C', subtasks: [{ id: 's', title: 'S', done: true }, { id: 'u', title: 'U' }] },
            { id: 'd', title: 'D', blocked: { since, blocker: 'Dev team' } },
            { id: 'e', title: 'E', blocked: { since, blocker: '  ' } },
            { id: 'f', title: 'F', done: true, blocked: { since } },
          ],
        },
      ],
      backlog: [],
    };
    const tasks = (migrate(v3) as { projects: { tasks: Record<string, unknown>[] }[] }).projects[0]!.tasks;
    expect(tasks.map((t) => [t.id, t.status])).toEqual([
      ['a', 'todo'],
      ['b', 'done'],
      ['c', 'working'],
      ['d', 'waiting'],
      ['e', 'waiting'],
      ['f', 'done'],
    ]);
    expect(tasks[3]).toMatchObject({ waiting: { since, on: 'Dev team' } });
    expect(tasks[4]!.waiting).toEqual({ since });
    for (const t of tasks) expect('blocked' in t).toBe(false);
    expect('waiting' in tasks[5]!).toBe(false);
  });

  it('refuses files from a newer version', () => {
    expect(() => migrate({ schemaVersion: 7 })).toThrow(MigrationError);
    expect(() => migrate({ schemaVersion: 7 })).toThrow(/newer version/);
  });

  it('refuses things that are not tracker files', () => {
    expect(() => migrate(null)).toThrow(MigrationError);
    expect(() => migrate('x')).toThrow(MigrationError);
    expect(() => migrate({ schemaVersion: '1' })).toThrow(/no schemaVersion/);
  });

  it('applies steps in order up to the target version', () => {
    const steps = {
      1: (r: Record<string, unknown>) => ({ ...r, items: r.things, things: undefined }),
      2: (r: Record<string, unknown>) => ({ ...r, count: (r.items as unknown[]).length }),
    };
    expect(migrate({ schemaVersion: 1, things: ['a', 'b'] }, steps, 3)).toEqual({
      schemaVersion: 3,
      items: ['a', 'b'],
      things: undefined,
      count: 2,
    });
  });

  it('fails clearly when a step is missing', () => {
    expect(() => migrate({ schemaVersion: 1 }, {}, 2)).toThrow(/No upgrade path from schema version 1/);
  });
});
