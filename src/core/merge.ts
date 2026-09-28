import { newId } from './id';
import type { BacklogItem, Project, Root } from './schema';
import { isNewer } from './time';

/**
 * Merge import (§6): add incoming projects and backlog items. On an id
 * collision the copy with the newer `updatedAt` wins (a tie keeps the current
 * one). Backlog items compare `updatedAt`, falling back to `createdAt`.
 */
export function mergeRoots(current: Root, incoming: Root, makeId: () => string = newId): Root {
  const projects = mergeById<Project>(current.projects, incoming.projects, (p) => p.updatedAt);
  const backlog = mergeById<BacklogItem>(current.backlog, incoming.backlog, (b) => b.updatedAt ?? b.createdAt);
  return dedupeIds({ ...current, projects, backlog }, makeId);
}

function mergeById<T extends { id: string }>(current: T[], incoming: T[], stamp: (x: T) => string): T[] {
  const out = [...current];
  const index = new Map(out.map((x, i) => [x.id, i]));
  for (const item of incoming) {
    const i = index.get(item.id);
    if (i === undefined) {
      index.set(item.id, out.length);
      out.push(item);
    } else if (isNewer(stamp(item), stamp(out[i]!))) {
      out[i] = item;
    }
  }
  return out;
}

/**
 * After a merge, an id can still repeat across different items (say a task
 * that was promoted from a backlog item that the other file still has). Keep
 * the first and give later ones fresh ids, so the result stays valid.
 */
export function dedupeIds(root: Root, makeId: () => string = newId): Root {
  const seen = new Set<string>();
  const fresh = <T extends { id: string }>(x: T): T => {
    if (!seen.has(x.id)) {
      seen.add(x.id);
      return x;
    }
    let id = makeId();
    while (seen.has(id)) id = makeId();
    seen.add(id);
    return { ...x, id };
  };
  return {
    ...root,
    projects: root.projects.map((p) => {
      const project = fresh(p);
      return {
        ...project,
        resources: project.resources.map(fresh),
        tasks: project.tasks.map((t) => {
          const task = fresh(t);
          return { ...task, subtasks: task.subtasks.map(fresh), resources: task.resources.map(fresh) };
        }),
      };
    }),
    backlog: root.backlog.map(fresh),
  };
}
