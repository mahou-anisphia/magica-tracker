import { isInProgress, isProjectDone } from './completion';
import { daysUntil } from './due';
import { currentPeriod, dayNumber, overlapDays, type PeriodRange } from './period';
import { allocationSettings, type AllocationSettings, type Priority, type Project, type Root, type Task } from './schema';

/** Tasks that count toward what's on your plate: open, in a project that's neither archived nor done. */
function* activeOpenTasks(root: Root): Generator<{ project: Project; task: Task }> {
  for (const project of root.projects) {
    if (project.archived || isProjectDone(project)) continue;
    for (const task of project.tasks) if (!task.done) yield { project, task };
  }
}

export type Allocation = AllocationSettings & {
  /** This period's load, in percent of your capacity. Can pass 100 and the limit. */
  total: number;
  /** How many open tasks add to it. */
  tasks: number;
  /** The period it covers. */
  range: PeriodRange;
};

/**
 * How much of one task's allocation lands in `range`. By default all of it
 * lands in the period its deadline falls in. A start date spreads it evenly,
 * by day, from the start to the deadline. Work that is overdue, or has no
 * deadline, is on your plate now.
 */
export function taskShare(task: Task, range: PeriodRange): number {
  const effort = task.effort ?? 0;
  if (!effort) return 0;
  if (!task.due) return effort;
  const due = dayNumber(task.due);
  if (due < dayNumber(range.start)) return effort;
  if (task.startsOn && dayNumber(task.startsOn) <= due) {
    const span = { start: task.startsOn, end: task.due };
    return (effort * overlapDays(span, range)) / (due - dayNumber(task.startsOn) + 1);
  }
  return due <= dayNumber(range.end) ? effort : 0;
}

/**
 * How much of you is spoken for this week or fortnight: every open task's
 * share of this period, added up across every active project, against the
 * limit the person set. Finishing a task, or its project, frees its share.
 */
export function allocation(root: Root, now: Date): Allocation {
  const settings = allocationSettings(root);
  const range = currentPeriod(now, settings.period);
  let total = 0;
  let tasks = 0;
  for (const { task } of activeOpenTasks(root)) {
    const share = taskShare(task, range);
    if (share <= 0) continue;
    total += share;
    tasks++;
  }
  return { ...settings, total: Math.round(total), tasks, range };
}

export type Stats = {
  /** Unfinished tasks. */
  open: number;
  /** Unfinished tasks with at least one sub-task done. */
  inProgress: number;
  /** Unfinished tasks marked urgent. */
  urgent: number;
  /** Unfinished tasks marked blocked. */
  blocked: number;
  /** Unfinished projects, tasks and sub-tasks past their deadline. */
  overdue: number;
};

/** The dashboard's numbers. Archived and done projects don't count. */
export function stats(root: Root, now: Date): Stats {
  const s: Stats = { open: 0, inProgress: 0, urgent: 0, blocked: 0, overdue: 0 };
  const overdue = (due: string | undefined, done: boolean) => {
    if (due && !done && daysUntil(due, now) < 0) s.overdue++;
  };
  for (const p of root.projects) {
    if (p.archived || isProjectDone(p)) continue;
    overdue(p.due, false);
    for (const t of p.tasks) {
      if (!t.done) s.open++;
      if (!t.done && t.priority === 'urgent') s.urgent++;
      if (!t.done && t.blocked) s.blocked++;
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
