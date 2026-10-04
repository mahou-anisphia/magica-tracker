import { isInProgress, isProjectDone } from './completion';
import { daysUntil } from './due';
import type { Priority, Project, Root, Task } from './schema';

/** How finished a task is, 0–1. Sub-tasks count fractionally. */
export function taskCompletion(task: Task): number {
  if (task.done) return 1;
  if (task.subtasks.length === 0) return 0;
  return task.subtasks.filter((s) => s.done).length / task.subtasks.length;
}

export type ProjectProgress = {
  /** Sum of the tasks' effort, in percent. Can exceed 100. */
  allocated: number;
  /** Effort finished so far, in percent of the whole project. */
  done: number;
  /** False when no task has an effort yet; `done` is then by task count. */
  weighted: boolean;
};

/**
 * Effort adds up: each task's effort is its share of the project, and the
 * project is as done as the effort finished. 40% done of 80% allocated means
 * a fifth of the project still has no task carrying it.
 * Without any efforts set, every task weighs the same.
 */
export function projectProgress(project: Project): ProjectProgress {
  const tasks = project.tasks;
  const allocated = tasks.reduce((n, t) => n + (t.effort ?? 0), 0);
  if (allocated === 0) {
    const done = tasks.length ? (100 * tasks.reduce((n, t) => n + taskCompletion(t), 0)) / tasks.length : 0;
    return { allocated: 0, done: Math.round(done), weighted: false };
  }
  const done = tasks.reduce((n, t) => n + (t.effort ?? 0) * taskCompletion(t), 0);
  return { allocated, done: Math.round(done), weighted: true };
}

export type Stats = {
  /** Unfinished tasks. */
  open: number;
  /** Unfinished tasks with at least one sub-task done. */
  inProgress: number;
  /** Unfinished projects, tasks and sub-tasks due today through the next 7 days. */
  dueThisWeek: number;
  /** Unfinished projects, tasks and sub-tasks past their deadline. */
  overdue: number;
};

/** The dashboard's numbers. Archived and done projects don't count. */
export function stats(root: Root, now: Date): Stats {
  const s: Stats = { open: 0, inProgress: 0, dueThisWeek: 0, overdue: 0 };
  const count = (due: string | undefined, done: boolean) => {
    if (!due || done) return;
    const d = daysUntil(due, now);
    if (d < 0) s.overdue++;
    else if (d <= 7) s.dueThisWeek++;
  };
  for (const p of root.projects) {
    if (p.archived || isProjectDone(p)) continue;
    count(p.due, false);
    for (const t of p.tasks) {
      if (!t.done) s.open++;
      if (isInProgress(t)) s.inProgress++;
      count(t.due, t.done);
      for (const st of t.subtasks) count(st.due, st.done);
    }
  }
  return s;
}

export const PRIORITY_RANK: Record<Priority, number> = { urgent: 4, high: 3, medium: 2, low: 1 };

/**
 * Open tasks most urgent first: priority, then the nearest deadline, then the
 * order they were added. Done tasks most recently finished first.
 */
export function orderTasks(tasks: Task[]): { open: Task[]; done: Task[] } {
  const indexed = tasks.map((t, i) => ({ t, i }));
  const open = indexed
    .filter(({ t }) => !t.done)
    .sort((a, b) => {
      const pr = (b.t.priority ? PRIORITY_RANK[b.t.priority] : 0) - (a.t.priority ? PRIORITY_RANK[a.t.priority] : 0);
      if (pr) return pr;
      const da = a.t.due ?? '9999-12-31';
      const db = b.t.due ?? '9999-12-31';
      if (da !== db) return da < db ? -1 : 1;
      return a.i - b.i;
    })
    .map(({ t }) => t);
  const done = indexed
    .filter(({ t }) => t.done)
    .sort((a, b) => (b.t.doneAt ?? '').localeCompare(a.t.doneAt ?? '') || a.i - b.i)
    .map(({ t }) => t);
  return { open, done };
}
