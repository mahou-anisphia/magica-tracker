import { isInProgress, isProjectDone, isWaiting } from './completion';
import { daysUntil } from './due';
import { PRIORITY_RANK } from './progress';
import type { Project, Root, Subtask, Task } from './schema';
import { daysSince } from './time';

/** Something a glance number counts: a task, or for Overdue also a project or a sub-task. */
export type GlanceRef = { project: Project; task?: Task; subtask?: Subtask };

export type GlanceLists = {
  /** Unfinished tasks, most pressing first: priority, then the nearest deadline. */
  open: GlanceRef[];
  /** Unfinished tasks being worked on, in the same order. */
  inProgress: GlanceRef[];
  /** Waiting tasks, longest waiting first. */
  waiting: GlanceRef[];
  /** Projects, tasks and sub-tasks past their deadline, most overdue first. */
  overdue: GlanceRef[];
};

const pressing = (a: GlanceRef, b: GlanceRef) => {
  const ta = a.task!;
  const tb = b.task!;
  const pr = (tb.priority ? PRIORITY_RANK[tb.priority] : 0) - (ta.priority ? PRIORITY_RANK[ta.priority] : 0);
  if (pr) return pr;
  return (ta.due ?? '9999-12-31').localeCompare(tb.due ?? '9999-12-31');
};

const dueOf = (r: GlanceRef) => r.subtask?.due ?? r.task?.due ?? r.project.due!;

/**
 * What each At a glance number counts, as lists, so a number can open into
 * its tasks. Counted exactly as `stats()` counts: archived and done projects
 * don't count. The sorts are stable, so ties keep your project and task order.
 */
export function glanceLists(root: Root, now: Date): GlanceLists {
  const lists: GlanceLists = { open: [], inProgress: [], waiting: [], overdue: [] };
  const late = (due: string | undefined, done: boolean) => !!due && !done && daysUntil(due, now) < 0;
  for (const project of root.projects) {
    if (project.archived || isProjectDone(project)) continue;
    if (late(project.due, false)) lists.overdue.push({ project });
    for (const task of project.tasks) {
      if (!task.done) lists.open.push({ project, task });
      if (isInProgress(task)) lists.inProgress.push({ project, task });
      if (isWaiting(task)) lists.waiting.push({ project, task });
      if (late(task.due, task.done)) lists.overdue.push({ project, task });
      for (const subtask of task.subtasks) if (late(subtask.due, subtask.done)) lists.overdue.push({ project, task, subtask });
    }
  }
  lists.open.sort(pressing);
  lists.inProgress.sort(pressing);
  const waited = (r: GlanceRef) => (r.task!.waiting ? daysSince(r.task!.waiting.since, now) : 0);
  lists.waiting.sort((a, b) => waited(b) - waited(a));
  lists.overdue.sort((a, b) => dueOf(a).localeCompare(dueOf(b)));
  return lists;
}
