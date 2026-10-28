import { isInProgress, isProjectDone, isWaiting } from './completion';
import { daysUntil, isDueSoon } from './due';
import type { CalendarEntry, Project, Root, Subtask, Task } from './schema';
import { daysSince } from './time';

/** An unfinished task untouched this many days is stale. Fixed on purpose. */
export const STALE_DAYS = 7;
/** Last export older than this turns the header indicator amber. */
export const EXPORT_STALE_DAYS = 14;

export function isStale(task: Task, now: Date): boolean {
  return !task.done && daysSince(task.updatedAt, now) >= STALE_DAYS;
}

export type TaskRef = { project: Project; task: Task };
export type StaleRef = TaskRef & { days: number };
/** A waiting open task: `days` since it started waiting. */
export type WaitingRef = TaskRef & { days: number };
/**
 * A deadline on a project, a task, or a sub-task (no task means the project's
 * own). `days` is days until due: 0 today, negative when overdue.
 */
export type DueRef = { project: Project; task?: Task; subtask?: Subtask; days: number };
/** An unfinished event past its last day: `days` is how many days ago that was, as a negative. */
export type EventRef = { entry: CalendarEntry; days: number };

export type Attention = {
  inProgress: TaskRef[];
  /** How many distinct projects the in-progress tasks span. */
  inProgressProjects: number;
  /** Unfinished projects, tasks and sub-tasks overdue, due today or due soon, most urgent first. */
  due: DueRef[];
  /** Unfinished events past their last day, most overdue first. */
  events: EventRef[];
  /** Waiting open tasks not already listed for a deadline, longest-waiting first. */
  waiting: WaitingRef[];
  /** Open tasks marked urgent that aren't already listed for a deadline or as waiting. */
  urgent: TaskRef[];
  /** Stalest first. A task already listed as due, waiting or urgent isn't repeated here. */
  stale: StaleRef[];
};

/** Computed on every render, never stored. Archived and done projects are ignored. */
export function attention(root: Root, now: Date): Attention {
  const inProgress: TaskRef[] = [];
  const due: DueRef[] = [];
  const waiting: WaitingRef[] = [];
  const urgent: TaskRef[] = [];
  const stale: StaleRef[] = [];
  for (const project of root.projects) {
    if (project.archived || isProjectDone(project)) continue;
    if (isDueSoon(project.due, false, now)) {
      due.push({ project, days: daysUntil(project.due!, now) });
    }
    for (const task of project.tasks) {
      if (isInProgress(task)) inProgress.push({ project, task });
      const taskDue = isDueSoon(task.due, task.done, now);
      if (taskDue) due.push({ project, task, days: daysUntil(task.due!, now) });
      for (const subtask of task.subtasks) {
        if (isDueSoon(subtask.due, subtask.done, now)) {
          due.push({ project, task, subtask, days: daysUntil(subtask.due!, now) });
        }
      }
      const isWaitingNow = !taskDue && isWaiting(task);
      if (isWaitingNow) waiting.push({ project, task, days: task.waiting ? daysSince(task.waiting.since, now) : 0 });
      const isUrgent = !taskDue && !isWaitingNow && !task.done && task.priority === 'urgent';
      if (isUrgent) urgent.push({ project, task });
      if (!taskDue && !isWaitingNow && !isUrgent && isStale(task, now)) {
        stale.push({ project, task, days: daysSince(task.updatedAt, now) });
      }
    }
  }
  const events: EventRef[] = [];
  for (const entry of root.calendar ?? []) {
    if (entry.kind !== 'event' || entry.done) continue;
    const days = daysUntil(entry.until ?? entry.date, now);
    if (days < 0) events.push({ entry, days });
  }
  due.sort((a, b) => a.days - b.days);
  events.sort((a, b) => a.days - b.days);
  waiting.sort((a, b) => b.days - a.days);
  stale.sort((a, b) => b.days - a.days);
  return {
    inProgress,
    inProgressProjects: new Set(inProgress.map((r) => r.project.id)).size,
    due,
    events,
    waiting,
    urgent,
    stale,
  };
}

export function isQuiet(a: Attention): boolean {
  return (
    a.inProgress.length === 0 && a.due.length === 0 && a.events.length === 0 && a.waiting.length === 0 && a.urgent.length === 0 && a.stale.length === 0
  );
}

export function isExportStale(lastExportedAt: string | null, now: Date): boolean {
  return lastExportedAt === null || daysSince(lastExportedAt, now) > EXPORT_STALE_DAYS;
}

export function hasOpenTasks(project: Project): boolean {
  return project.tasks.some((t) => !t.done);
}
