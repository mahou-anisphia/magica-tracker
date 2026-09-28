import { isInProgress, isProjectDone } from './completion';
import { daysUntil, isDueSoon } from './due';
import type { Project, Root, Subtask, Task } from './schema';
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
/**
 * A deadline on a project, a task, or a sub-task (no task means the project's
 * own). `days` is days until due: 0 today, negative when overdue.
 */
export type DueRef = { project: Project; task?: Task; subtask?: Subtask; days: number };

export type Attention = {
  inProgress: TaskRef[];
  /** How many distinct projects the in-progress tasks span. */
  inProgressProjects: number;
  /** Unfinished projects, tasks and sub-tasks overdue, due today or due soon, most urgent first. */
  due: DueRef[];
  /** Stalest first. A task already listed as due isn't repeated here. */
  stale: StaleRef[];
};

/** Computed on every render, never stored. Archived projects are ignored. */
export function attention(root: Root, now: Date): Attention {
  const inProgress: TaskRef[] = [];
  const due: DueRef[] = [];
  const stale: StaleRef[] = [];
  for (const project of root.projects) {
    if (project.archived) continue;
    if (isDueSoon(project.due, isProjectDone(project), now)) {
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
      if (!taskDue && isStale(task, now)) stale.push({ project, task, days: daysSince(task.updatedAt, now) });
    }
  }
  due.sort((a, b) => a.days - b.days);
  stale.sort((a, b) => b.days - a.days);
  return {
    inProgress,
    inProgressProjects: new Set(inProgress.map((r) => r.project.id)).size,
    due,
    stale,
  };
}

export function isQuiet(a: Attention): boolean {
  return a.inProgress.length === 0 && a.due.length === 0 && a.stale.length === 0;
}

export function isExportStale(lastExportedAt: string | null, now: Date): boolean {
  return lastExportedAt === null || daysSince(lastExportedAt, now) > EXPORT_STALE_DAYS;
}

export function hasOpenTasks(project: Project): boolean {
  return project.tasks.some((t) => !t.done);
}
