import type { Project, Root, Subtask, Task } from './schema';

/**
 * The completion rule (§3). A task with sub-tasks is done exactly when every
 * sub-task is done. A task without sub-tasks keeps whatever was set directly.
 * `doneAt` exists only while something is done.
 *
 * Only `done`/`doneAt` change here, never `updatedAt`: deriving a value is not
 * an edit, so it must not reset the staleness clock.
 */

export function normalizeSubtask(s: Subtask, now: string): Subtask {
  const { doneAt, ...rest } = s;
  return s.done ? { ...rest, doneAt: doneAt ?? now } : rest;
}

export function normalizeTask(task: Task, now: string): Task {
  const subtasks = task.subtasks.map((s) => normalizeSubtask(s, now));
  const done = subtasks.length > 0 ? subtasks.every((s) => s.done) : task.done;
  const { doneAt, ...rest } = task;
  if (!done) return { ...rest, subtasks, done };
  return { ...rest, subtasks, done, doneAt: doneAt ?? latestDoneAt(subtasks) ?? now };
}

function latestDoneAt(subtasks: Subtask[]): string | undefined {
  let latest: string | undefined;
  for (const s of subtasks) {
    if (s.doneAt && (!latest || Date.parse(s.doneAt) > Date.parse(latest))) latest = s.doneAt;
  }
  return latest;
}

export function normalizeProject(p: Project, now: string): Project {
  return { ...p, tasks: p.tasks.map((t) => normalizeTask(t, now)) };
}

/** Run by commit() before every save and on every load/import. */
export function normalizeRoot(root: Root, now: string): Root {
  return { ...root, projects: root.projects.map((p) => normalizeProject(p, now)) };
}

export function subtaskProgress(task: Task): { done: number; total: number } {
  return { done: task.subtasks.filter((s) => s.done).length, total: task.subtasks.length };
}

/** A project is done when it has been marked done, whatever its tasks say. */
export function isProjectDone(p: Project): boolean {
  return p.doneAt !== undefined;
}

export function isInProgress(task: Task): boolean {
  return !task.done && task.subtasks.some((s) => s.done);
}
