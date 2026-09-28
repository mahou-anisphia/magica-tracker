import type { BacklogItem, Project, Root, Subtask, Task } from '../src/core/schema';

export const T0 = '2026-09-01T09:00:00.000Z';
export const T1 = '2026-09-02T09:00:00.000Z';
export const T2 = '2026-09-03T09:00:00.000Z';

export function subtask(id: string, done = false, extra: Partial<Subtask> = {}): Subtask {
  return { id, title: `Sub ${id}`, done, ...(done ? { doneAt: T0 } : {}), ...extra };
}

export function task(id: string, extra: Partial<Task> = {}): Task {
  return {
    id,
    title: `Task ${id}`,
    done: false,
    createdAt: T0,
    updatedAt: T0,
    subtasks: [],
    resources: [],
    ...extra,
  };
}

export function project(id: string, extra: Partial<Project> = {}): Project {
  return {
    id,
    name: `Project ${id}`,
    archived: false,
    createdAt: T0,
    updatedAt: T0,
    tasks: [],
    resources: [],
    ...extra,
  };
}

export function backlogItem(id: string, extra: Partial<BacklogItem> = {}): BacklogItem {
  return { id, title: `Idea ${id}`, createdAt: T0, ...extra };
}

export function root(extra: Partial<Root> = {}): Root {
  return { schemaVersion: 1, updatedAt: T0, projects: [], backlog: [], ...extra };
}

export function getTask(r: Root, projectId: string, taskId: string): Task {
  const t = r.projects.find((p) => p.id === projectId)?.tasks.find((x) => x.id === taskId);
  if (!t) throw new Error(`no task ${taskId}`);
  return t;
}

/** Sequential ids for deterministic tests. */
export function idMaker(prefix = 'new'): () => string {
  let n = 0;
  return () => `${prefix}-${++n}`;
}
