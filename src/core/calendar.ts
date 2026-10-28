import { isProjectDone } from './completion';
import { isDueSoon } from './due';
import { PRIORITY_RANK } from './progress';
import { daysUntil } from './due';
import type { CalendarEntry, Project, Root, Subtask, Task } from './schema';
import { localDateStamp } from './time';
import { entryDays } from './workdays';

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

type Shown = {
  title: string;
  done: boolean;
  /** A deadline unfinished and overdue or due within DUE_SOON_DAYS; an event unfinished past its last day. */
  watch: boolean;
  /** An unfinished task (not a sub-task) marked urgent. */
  urgent: boolean;
};

/** Something on a day: a deadline (a project's, a task's or a sub-task's), or an event. */
export type DueItem =
  | (Shown & {
      kind: 'deadline';
      project: Project;
      /** Absent for the project's own deadline. */
      task?: Task;
      subtask?: Subtask;
    })
  | (Shown & { kind: 'event'; entry: CalendarEntry });

/**
 * Everything with a due date, and every event (on each of its days), grouped
 * by day. Archived projects are left out. Within a day, most urgent first:
 * unfinished before done, then project deadlines, then by priority (a
 * sub-task counts as its task's; an event as a task with none), then tasks
 * and events before sub-tasks, then events by time, then the order added.
 * Leave and holidays aren't items: `daysOff` marks those days.
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
      add(project.due, { kind: 'deadline', project, title: project.name, done, watch: isDueSoon(project.due, done, now), urgent: false });
    }
    for (const task of project.tasks) {
      if (task.due) {
        add(task.due, {
          kind: 'deadline',
          project,
          task,
          title: task.title,
          done: task.done,
          watch: isDueSoon(task.due, task.done, now),
          urgent: !task.done && task.priority === 'urgent',
        });
      }
      for (const subtask of task.subtasks) {
        if (!subtask.due) continue;
        add(subtask.due, {
          kind: 'deadline',
          project,
          task,
          subtask,
          title: subtask.title,
          done: subtask.done,
          watch: isDueSoon(subtask.due, subtask.done, now),
          urgent: false,
        });
      }
    }
  }
  for (const entry of root.calendar ?? []) {
    if (entry.kind !== 'event') continue;
    const last = entry.until ?? entry.date;
    const watch = !entry.done && daysUntil(last, now) < 0;
    for (const day of entryDays(entry)) add(day, { kind: 'event', entry, title: entry.title, done: entry.done, watch, urgent: false });
  }
  for (const list of byDate.values()) {
    // Stable sort: equal items keep the order added.
    list.sort((a, b) => Number(a.done) - Number(b.done) || urgency(b) - urgency(a) || depth(a) - depth(b) || timeOf(a).localeCompare(timeOf(b)));
  }
  return byDate;
}

/** A project's own deadline above any task, then the task's priority (0 for none, and for an event). */
function urgency(item: DueItem): number {
  if (item.kind === 'event') return 0;
  if (!item.task) return 5;
  return item.task.priority ? PRIORITY_RANK[item.task.priority] : 0;
}

/** 0 project, 1 task or event, 2 sub-task. */
function depth(item: DueItem): number {
  if (item.kind === 'event') return 1;
  return item.subtask ? 2 : item.task ? 1 : 0;
}

/** An event's time; untimed events and deadlines sort as the start of the day. */
const timeOf = (item: DueItem) => (item.kind === 'event' ? (item.entry.time ?? '') : '');
