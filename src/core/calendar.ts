import { isProjectDone } from './completion';
import { isDueSoon } from './due';
import type { Project, Root, Subtask, Task } from './schema';
import { localDateStamp } from './time';

export type CalendarDay = { date: string; day: number; inMonth: boolean };

/**
 * The weeks covering a month, Monday first, including the spill-over days
 * from the months around it. Only as many weeks as the month needs (4–6).
 * `month` is 0-based, like Date.
 */
export function monthGrid(year: number, month: number): CalendarDay[][] {
  const first = new Date(year, month, 1);
  const lead = (first.getDay() + 6) % 7; // Monday = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const weekCount = Math.ceil((lead + daysInMonth) / 7);
  const weeks: CalendarDay[][] = [];
  for (let w = 0; w < weekCount; w++) {
    const week: CalendarDay[] = [];
    for (let i = 0; i < 7; i++) {
      // Day arithmetic via the Date constructor stays correct across DST changes.
      const d = new Date(year, month, 1 - lead + w * 7 + i);
      week.push({ date: localDateStamp(d), day: d.getDate(), inMonth: d.getMonth() === month });
    }
    weeks.push(week);
  }
  return weeks;
}

export type DueItem = {
  project: Project;
  /** Absent for the project's own deadline. */
  task?: Task;
  subtask?: Subtask;
  title: string;
  done: boolean;
  /** Unfinished and overdue or due within DUE_SOON_DAYS. */
  watch: boolean;
};

/**
 * Everything with a due date, grouped by day. Archived projects are left out.
 * Within a day: unfinished first, then projects, tasks, sub-tasks.
 */
export function dueByDate(root: Root, now: Date): Map<string, DueItem[]> {
  const byDate = new Map<string, DueItem[]>();
  const add = (date: string, item: DueItem) => {
    const list = byDate.get(date);
    if (list) list.push(item);
    else byDate.set(date, [item]);
  };
  for (const project of root.projects) {
    if (project.archived) continue;
    if (project.due) {
      const done = isProjectDone(project);
      add(project.due, { project, title: project.name, done, watch: isDueSoon(project.due, done, now) });
    }
    for (const task of project.tasks) {
      if (task.due) {
        add(task.due, { project, task, title: task.title, done: task.done, watch: isDueSoon(task.due, task.done, now) });
      }
      for (const subtask of task.subtasks) {
        if (!subtask.due) continue;
        add(subtask.due, {
          project,
          task,
          subtask,
          title: subtask.title,
          done: subtask.done,
          watch: isDueSoon(subtask.due, subtask.done, now),
        });
      }
    }
  }
  for (const list of byDate.values()) {
    list.sort((a, b) => Number(a.done) - Number(b.done) || depth(a) - depth(b));
  }
  return byDate;
}

/** 0 project, 1 task, 2 sub-task. */
function depth(item: DueItem): number {
  return item.subtask ? 2 : item.task ? 1 : 0;
}
