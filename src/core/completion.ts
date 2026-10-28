import type { CalendarEntry, Project, Root, Subtask, Task } from './schema';

/**
 * The completion rule (§3). A task with sub-tasks is done exactly when every
 * sub-task is done. A task without sub-tasks keeps whatever was set directly.
 * `doneAt` exists only while something is done.
 *
 * The status follows: a done task is Done; a task reopened from Done goes
 * back to Working (some sub-task still done) or To do; ticking a sub-task of
 * a To do task makes it Working. Waiting keeps its details only while waiting.
 *
 * Only `done`/`doneAt`/`status`/`waiting` change here, never `updatedAt`:
 * deriving a value is not an edit, so it must not reset the staleness clock.
 */

export function normalizeSubtask(s: Subtask, now: string): Subtask {
  const { doneAt, ...rest } = s;
  return s.done ? { ...rest, doneAt: doneAt ?? now } : rest;
}

export function normalizeTask(task: Task, now: string): Task {
  const subtasks = task.subtasks.map((s) => normalizeSubtask(s, now));
  const done = subtasks.length > 0 ? subtasks.every((s) => s.done) : task.done;
  const { doneAt, waiting, ...rest } = task;
  if (done) return { ...rest, subtasks, done, status: 'done', doneAt: doneAt ?? latestDoneAt(subtasks) ?? now };
  const started = subtasks.some((s) => s.done);
  const status = task.status === 'done' || task.status === 'todo' ? (started ? 'working' : 'todo') : task.status;
  if (status === 'waiting') return { ...rest, subtasks, done, status, waiting: waiting ?? { since: now } };
  return { ...rest, subtasks, done, status };
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

/**
 * An event keeps `doneAt` only while done. Leave and holidays are never done
 * and have no time or allocation. An end on or before the start is dropped.
 */
export function normalizeEntry(e: CalendarEntry, now: string): CalendarEntry {
  const { until, time, effort, doneAt, ...rest } = e;
  const span = until && until > e.date ? { until } : {};
  if (e.kind !== 'event') return { ...rest, ...span, done: false };
  return {
    ...rest,
    ...span,
    ...(time ? { time } : {}),
    ...(effort !== undefined ? { effort } : {}),
    ...(e.done ? { doneAt: doneAt ?? now } : {}),
  };
}

/** Run by commit() before every save and on every load/import. */
export function normalizeRoot(root: Root, now: string): Root {
  const next = { ...root, projects: root.projects.map((p) => normalizeProject(p, now)) };
  return root.calendar ? { ...next, calendar: root.calendar.map((e) => normalizeEntry(e, now)) } : next;
}

export function subtaskProgress(task: Task): { done: number; total: number } {
  return { done: task.subtasks.filter((s) => s.done).length, total: task.subtasks.length };
}

/** A project is done when it has been marked done, whatever its tasks say. */
export function isProjectDone(p: Project): boolean {
  return p.doneAt !== undefined;
}

/** Working on it: set by hand, or by ticking one of its sub-tasks. */
export function isInProgress(task: Task): boolean {
  return !task.done && task.status === 'working';
}

/** Waiting on someone or something; `waiting` says since when and on what. */
export function isWaiting(task: Task): boolean {
  return !task.done && task.status === 'waiting';
}
