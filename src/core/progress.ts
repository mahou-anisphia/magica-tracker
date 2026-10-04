import { isInProgress, isProjectDone } from './completion';
import { daysUntil } from './due';
import type { Priority, Project, Root, Task } from './schema';

/** The allocation bar runs from 0 to this; past 100% is overload. */
export const ALLOCATION_SCALE = 200;

/** Tasks that count toward what's on your plate: open, in a project that's neither archived nor done. */
function* activeOpenTasks(root: Root): Generator<{ project: Project; task: Task }> {
  for (const project of root.projects) {
    if (project.archived || isProjectDone(project)) continue;
    for (const task of project.tasks) if (!task.done) yield { project, task };
  }
}

export type Allocation = {
  /** Sum of the open tasks' allocation, in percent of your capacity. Can pass 100. */
  total: number;
  /** How many open tasks carry an allocation. */
  tasks: number;
};

/**
 * One shared number: how much of you is spoken for. Each open task's
 * allocation (`effort`, a percent of your capacity) adds up across every
 * active project. Finishing a task, or the project it's in, frees its share.
 */
export function allocation(root: Root): Allocation {
  let total = 0;
  let tasks = 0;
  for (const { task } of activeOpenTasks(root)) {
    if (task.effort === undefined) continue;
    total += task.effort;
    tasks++;
  }
  return { total, tasks };
}

export type Stats = {
  /** Unfinished tasks. */
  open: number;
  /** Unfinished tasks with at least one sub-task done. */
  inProgress: number;
  /** Unfinished tasks marked urgent. */
  urgent: number;
  /** Unfinished projects, tasks and sub-tasks past their deadline. */
  overdue: number;
};

/** The dashboard's numbers. Archived and done projects don't count. */
export function stats(root: Root, now: Date): Stats {
  const s: Stats = { open: 0, inProgress: 0, urgent: 0, overdue: 0 };
  const overdue = (due: string | undefined, done: boolean) => {
    if (due && !done && daysUntil(due, now) < 0) s.overdue++;
  };
  for (const p of root.projects) {
    if (p.archived || isProjectDone(p)) continue;
    overdue(p.due, false);
    for (const t of p.tasks) {
      if (!t.done) s.open++;
      if (!t.done && t.priority === 'urgent') s.urgent++;
      if (isInProgress(t)) s.inProgress++;
      overdue(t.due, t.done);
      for (const st of t.subtasks) overdue(st.due, st.done);
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
