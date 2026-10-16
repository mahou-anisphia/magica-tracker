import { isInProgress, isProjectDone, isWaiting } from './completion';
import { daysUntil } from './due';
import { currentPeriod, dayNumber, overlapDays, periodLength, periodOf, stampOf, type PeriodRange } from './period';
import { allocationSettings, type AllocationSettings, type Priority, type Project, type Root, type Task } from './schema';
import { localDateStamp } from './time';

/**
 * Tasks that count toward a period's load: open ones in a project that's
 * neither archived nor done, and every finished one. Work you finished stays
 * in the period it was done in, whatever happens to its project later.
 */
function* countedTasks(root: Root): Generator<{ project: Project; task: Task }> {
  for (const project of root.projects) {
    const active = !project.archived && !isProjectDone(project);
    for (const task of project.tasks) if (task.done || active) yield { project, task };
  }
}

/** One task's part of a period's load. */
export type LoadItem = { project: Project; task: Task; share: number };

export type Allocation = AllocationSettings & {
  /** This period's load, in percent of your capacity. Can pass 100 and the limit. */
  total: number;
  /** How many tasks add to it. */
  tasks: number;
  /** How many of those are done. */
  done: number;
  /** The period it covers. */
  range: PeriodRange;
  /** What adds to it, largest share first. */
  items: LoadItem[];
};

/**
 * How much of one task's allocation lands in `range`. By default all of it
 * lands in the period its deadline falls in. A start date spreads it evenly,
 * by day, from the start to the deadline. Work that is overdue, or has no
 * deadline, is on your plate now. Finishing a task doesn't move it: it keeps
 * the share it had on the day it was done, so finished work that was late or
 * undated stays in the period it was finished in.
 */
export function taskShare(task: Task, range: PeriodRange, today: string = range.start): number {
  const effort = task.effort ?? 0;
  if (!effort) return 0;
  const start = dayNumber(range.start);
  const len = dayNumber(range.end) - start + 1;
  /** Which period a day falls in, counting `range` as 0. */
  const at = (n: number) => Math.floor((n - start) / len);
  // Late or undated work lands where you were with it: today while it's open,
  // the day it was finished once done (unknown: long ago).
  const landed = !task.done ? dayNumber(today) : task.doneAt ? dayNumber(localDateStamp(new Date(task.doneAt))) : -Infinity;
  if (!task.due || at(landed) > at(dayNumber(task.due))) return at(landed) === 0 ? effort : 0;
  const due = dayNumber(task.due);
  if (task.startsOn && dayNumber(task.startsOn) <= due) {
    const span = { start: task.startsOn, end: task.due };
    return (effort * overlapDays(span, range)) / (due - dayNumber(task.startsOn) + 1);
  }
  return at(due) === 0 ? effort : 0;
}

/** Every task's share of `range`, added up, as of `today`. */
function loadIn(root: Root, settings: AllocationSettings, range: PeriodRange, today: string): Allocation {
  const items: LoadItem[] = [];
  let total = 0;
  for (const { project, task } of countedTasks(root)) {
    const share = taskShare(task, range, today);
    if (share <= 0) continue;
    total += share;
    items.push({ project, task, share });
  }
  items.sort((a, b) => b.share - a.share);
  const done = items.filter((i) => i.task.done).length;
  return { ...settings, total: Math.round(total), tasks: items.length, done, range, items };
}

/**
 * How much of you is spoken for this week or fortnight: every task's share of
 * this period, added up across every project, against the limit the person
 * set. The period is fixed, so finishing a task doesn't free its share; work
 * left open in a project marked done, or archived, no longer counts.
 */
export function allocation(root: Root, now: Date): Allocation {
  const settings = allocationSettings(root);
  return loadIn(root, settings, currentPeriod(now, settings.period), localDateStamp(now));
}

/**
 * The last `count` periods' allocation, oldest first, this one last, by the
 * person's own period and limit. Worked out from the tasks as they are now:
 * finished work stays where it counted, open work that is late or undated
 * counts in this period only, and a deleted task leaves no trace. Periods
 * before anything was allocated are left out.
 */
export function allocationHistory(root: Root, now: Date, count: number): Allocation[] {
  const settings = allocationSettings(root);
  const today = localDateStamp(now);
  const len = periodLength(settings.period);
  const start = dayNumber(currentPeriod(now, settings.period).start);
  const out: Allocation[] = [];
  for (let i = count - 1; i >= 0; i--) {
    out.push(loadIn(root, settings, periodOf(stampOf(start - i * len), settings.period), today));
  }
  const first = out.findIndex((a) => a.tasks > 0);
  return first < 0 ? out.slice(-1) : out.slice(first);
}

export type Stats = {
  /** Unfinished tasks. */
  open: number;
  /** Unfinished tasks being worked on (status Working). */
  inProgress: number;
  /** Unfinished tasks marked urgent. */
  urgent: number;
  /** Unfinished tasks waiting on someone or something. */
  waiting: number;
  /** Unfinished projects, tasks and sub-tasks past their deadline. */
  overdue: number;
};

/** The dashboard's numbers. Archived and done projects don't count. */
export function stats(root: Root, now: Date): Stats {
  const s: Stats = { open: 0, inProgress: 0, urgent: 0, waiting: 0, overdue: 0 };
  const overdue = (due: string | undefined, done: boolean) => {
    if (due && !done && daysUntil(due, now) < 0) s.overdue++;
  };
  for (const p of root.projects) {
    if (p.archived || isProjectDone(p)) continue;
    overdue(p.due, false);
    for (const t of p.tasks) {
      if (!t.done) s.open++;
      if (!t.done && t.priority === 'urgent') s.urgent++;
      if (isWaiting(t)) s.waiting++;
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
