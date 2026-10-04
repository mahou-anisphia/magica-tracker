import { describe, expect, it } from 'vitest';
import { attention } from '../src/core/attention';
import { exportJson } from '../src/core/exportFile';
import { mergeRoots } from '../src/core/merge';
import { setProjectDone, setTaskEffort, setTaskPriority } from '../src/core/ops';
import { allocation, orderTasks, stats } from '../src/core/progress';
import { SCHEMA_VERSION } from '../src/core/schema';
import { parseRoot, parseRootText } from '../src/core/validate';
import { T0, T1, T2, project, root, subtask, task } from './fixtures';

const NOW = new Date(2026, 8, 28, 12, 0, 0);

/** Exactly what the first release (schema 1) wrote on Export. */
const V1_EXPORT = `{
  "schemaVersion": 1,
  "exportedAt": "2026-09-28T09:00:00.000Z",
  "updatedAt": "2026-09-27T18:12:44.120Z",
  "projects": [
    {
      "id": "6f1c1d1e-8a43-4f0e-9a51-0d2d3c1b7a10",
      "name": "Aegis",
      "description": "Security work",
      "archived": false,
      "createdAt": "2026-09-01T09:00:00.000Z",
      "updatedAt": "2026-09-27T18:12:44.120Z",
      "tasks": [
        {
          "id": "0c6f0b8e-2a7c-4c56-8e8b-3b8f8f0e6a01",
          "title": "Write threat model",
          "done": false,
          "notes": "STRIDE first",
          "createdAt": "2026-09-01T09:00:00.000Z",
          "updatedAt": "2026-09-27T18:12:44.120Z",
          "subtasks": [
            { "id": "a1", "title": "Outline", "done": true, "doneAt": "2026-09-20T10:00:00.000Z" },
            { "id": "a2", "title": "Draft", "done": false }
          ],
          "resources": [
            { "id": "r1", "header": "STRIDE", "url": "https://example.com/stride", "addedAt": "2026-09-02T09:00:00.000Z" }
          ]
        }
      ],
      "resources": []
    }
  ],
  "backlog": [
    { "id": "b1", "title": "Look into passkeys", "createdAt": "2026-09-05T09:00:00.000Z" }
  ]
}`;

describe('v1 → v2 migration', () => {
  it('loads a v1 export as v2 with every value kept and nothing invented', () => {
    const r = parseRootText(V1_EXPORT);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.root.schemaVersion).toBe(SCHEMA_VERSION);
    const original = JSON.parse(V1_EXPORT);
    delete original.exportedAt;
    expect({ ...r.root, schemaVersion: 1 }).toEqual(original);
    const t = r.root.projects[0]!.tasks[0]!;
    for (const key of ['due', 'priority', 'effort']) expect(key in t).toBe(false);
    expect('doneAt' in r.root.projects[0]!).toBe(false);
  });

  it('is what localStorage data from v1 goes through too, and saves back as v2', () => {
    const r = parseRootText(V1_EXPORT);
    if (!r.ok) throw new Error(r.error);
    const again = parseRootText(exportJson(r.root, T2));
    expect(again).toEqual({ ok: true, root: r.root });
    expect(JSON.parse(exportJson(r.root, T2)).schemaVersion).toBe(2);
  });

  it('merges a v1 file into v2 data', () => {
    const v1 = parseRootText(V1_EXPORT);
    if (!v1.ok) throw new Error(v1.error);
    const merged = mergeRoots(root({ projects: [project('mine')] }), v1.root);
    expect(merged.projects.map((p) => p.name)).toEqual(['Project mine', 'Aegis']);
    expect(parseRoot(merged).ok).toBe(true);
  });

  it('rejects bad values in the new fields with a readable error', () => {
    const bad = (extra: object) => {
      const r = parseRoot(JSON.parse(JSON.stringify(root({ projects: [project('p', { name: 'Aegis', tasks: [{ ...task('t', { title: 'X' }), ...extra }] })] }))));
      return r.ok ? '' : r.error;
    };
    expect(bad({ priority: 'critical' })).toMatch(/^Task 'X' in project 'Aegis' has an invalid “priority”/);
    expect(bad({ effort: 150 })).toMatch(/^Task 'X' in project 'Aegis' has an invalid “effort”/);
    expect(bad({ effort: 12.5 })).toMatch(/invalid “effort”/);
  });
});

describe('priority and effort', () => {
  const base = () => root({ projects: [project('p', { tasks: [task('t')] })] });

  it('set and clear, bumping updatedAt', () => {
    let r = setTaskPriority(base(), 'p', 't', 'urgent', T1);
    r = setTaskEffort(r, 'p', 't', 30, T1);
    expect(r.projects[0]!.tasks[0]).toMatchObject({ priority: 'urgent', effort: 30, updatedAt: T1 });
    r = setTaskPriority(r, 'p', 't', undefined, T2);
    r = setTaskEffort(r, 'p', 't', undefined, T2);
    expect('priority' in r.projects[0]!.tasks[0]!).toBe(false);
    expect('effort' in r.projects[0]!.tasks[0]!).toBe(false);
  });

  it('refuses out-of-range effort', () => {
    const r = base();
    expect(setTaskEffort(r, 'p', 't', 101, T1)).toBe(r);
    expect(setTaskEffort(r, 'p', 't', -1, T1)).toBe(r);
    expect(setTaskEffort(r, 'p', 't', 2.5, T1)).toBe(r);
  });
});

describe('allocation adds up across everything', () => {
  it('sums open tasks in active projects only', () => {
    const r = root({
      projects: [
        project('a', { tasks: [task('a1', { effort: 60 }), task('a2', { effort: 50 }), task('a3'), task('a4', { effort: 30, done: true, doneAt: T0 })] }),
        project('b', { tasks: [task('b1', { effort: 25 })] }),
        project('arch', { archived: true, tasks: [task('x', { effort: 40 })] }),
        project('fin', { doneAt: T0, tasks: [task('y', { effort: 40 })] }),
      ],
    });
    expect(allocation(r)).toEqual({ total: 135, tasks: 3 });
  });

  it('finishing a task or its project frees its share', () => {
    let r = root({ projects: [project('p', { tasks: [task('t', { effort: 70 })] })] });
    expect(allocation(r).total).toBe(70);
    expect(allocation(setProjectDone(r, 'p', true, T1)).total).toBe(0);
    r = root({ projects: [project('p', { tasks: [task('t', { effort: 70, done: true, doneAt: T0 })] })] });
    expect(allocation(r).total).toBe(0);
  });

  it('is zero with nothing allocated', () => {
    expect(allocation(root())).toEqual({ total: 0, tasks: 0 });
  });
});

describe('dashboard numbers', () => {
  it('counts open, in progress, urgent and overdue, skipping archived and done projects', () => {
    const r = root({
      projects: [
        project('p', {
          due: '2026-09-27', // overdue
          tasks: [
            task('a', { due: '2026-09-28', priority: 'urgent' }), // urgent, due today (not overdue)
            task('b', { due: '2026-10-05', subtasks: [subtask('s', true), subtask('t', false, { due: '2026-09-20' })] }), // overdue sub-task
            task('c', { due: '2026-10-06' }),
            task('d', { done: true, doneAt: T0, due: '2026-09-01', priority: 'urgent' }), // done: neither overdue nor urgent
          ],
        }),
        project('arch', { archived: true, tasks: [task('x', { due: '2026-09-01' })] }),
        project('fin', { doneAt: T0, due: '2026-09-01', tasks: [task('y', { due: '2026-09-01' })] }),
      ],
    });
    expect(stats(r, NOW)).toEqual({ open: 3, inProgress: 1, urgent: 1, overdue: 2 });
  });
});

describe('ordering', () => {
  it('puts urgent first, then nearer deadlines, then the order added; done most recent first', () => {
    const { open, done } = orderTasks([
      task('plain'),
      task('soon', { due: '2026-10-01' }),
      task('high-later', { priority: 'high', due: '2026-12-01' }),
      task('urgent', { priority: 'urgent' }),
      task('high-sooner', { priority: 'high', due: '2026-10-02' }),
      task('later', { due: '2026-11-01' }),
      task('done-old', { done: true, doneAt: T0 }),
      task('done-new', { done: true, doneAt: T2 }),
    ]);
    expect(open.map((t) => t.id)).toEqual(['urgent', 'high-sooner', 'high-later', 'soon', 'later', 'plain']);
    expect(done.map((t) => t.id)).toEqual(['done-new', 'done-old']);
  });
});

describe('project done', () => {
  it('is explicit, keeps tasks as they are, and can be reopened', () => {
    let r = root({ projects: [project('p', { tasks: [task('open')] })] });
    r = setProjectDone(r, 'p', true, T1);
    expect(r.projects[0]).toMatchObject({ doneAt: T1, updatedAt: T1 });
    expect(r.projects[0]!.tasks[0]!.done).toBe(false);
    // Marking again keeps the original date.
    expect(setProjectDone(r, 'p', true, T2).projects[0]!.doneAt).toBe(T1);
    r = setProjectDone(r, 'p', false, T2);
    expect('doneAt' in r.projects[0]!).toBe(false);
  });

  it('takes a done project out of Needs attention', () => {
    const urgentTask = task('u', { priority: 'urgent', updatedAt: T0 });
    const r = root({ projects: [project('p', { tasks: [urgentTask] })] });
    expect(attention(r, NOW).urgent).toHaveLength(1);
    expect(attention(setProjectDone(r, 'p', true, T1), NOW).urgent).toHaveLength(0);
  });

  it('lists urgent tasks once: under their deadline if they have one', () => {
    const r = root({ projects: [project('p', { tasks: [task('u', { priority: 'urgent', due: '2026-09-29', updatedAt: T0 })] })] });
    const a = attention(r, NOW);
    expect(a.due).toHaveLength(1);
    expect(a.urgent).toHaveLength(0);
    expect(a.stale).toHaveLength(0);
  });
});
