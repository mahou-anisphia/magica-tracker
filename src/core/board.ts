import { isProjectDone } from './completion';
import { daysUntil, DUE_SOON_DAYS } from './due';
import { PRIORITY_RANK } from './progress';
import type { Project, Root, Status, Task } from './schema';
import { daysSince } from './time';

/**
 * The Board: every active project as a lane, its tasks in columns by status.
 * Done shows only the last few days, so it shows progress without growing
 * forever. Lanes that need you sort first.
 */

/** How long a done task stays in the Done column. */
export const BOARD_DONE_DAYS = 7;

export type BoardLane = { project: Project; cells: Record<Status, Task[]>; needs: 'now' | 'soon' | 'later' };

export type BoardCounts = {
  overdue: number;
  /** Due today or within DUE_SOON_DAYS, not overdue. */
  dueSoon: number;
  urgent: number;
  waiting: number;
  /** Days the longest-waiting task has waited. */
  longestWait: number;
};

const RANK = { now: 0, soon: 1, later: 2 } as const;
const priorityRank = (t: Task) => (t.priority ? PRIORITY_RANK[t.priority] : 0);

/** Soonest deadline first (none last), then the higher priority, then the order added. */
function byDue(a: Task, b: Task): number {
  if (a.due !== b.due) return !a.due ? 1 : !b.due ? -1 : a.due.localeCompare(b.due);
  return priorityRank(b) - priorityRank(a);
}

export function board(root: Root, now: Date): { lanes: BoardLane[]; counts: BoardCounts } {
  const counts: BoardCounts = { overdue: 0, dueSoon: 0, urgent: 0, waiting: 0, longestWait: 0 };
  const lanes: BoardLane[] = [];
  for (const project of root.projects) {
    if (project.archived || isProjectDone(project)) continue;
    const cells: Record<Status, Task[]> = { todo: [], working: [], waiting: [], done: [] };
    let needs: BoardLane['needs'] = 'later';
    for (const task of project.tasks) {
      if (task.done) {
        if (task.doneAt && daysSince(task.doneAt, now) < BOARD_DONE_DAYS) cells.done.push(task);
        continue;
      }
      cells[task.status === 'done' ? 'todo' : task.status].push(task);
      const days = task.due === undefined ? null : daysUntil(task.due, now);
      if (days !== null && days < 0) counts.overdue++;
      else if (days !== null && days <= DUE_SOON_DAYS) counts.dueSoon++;
      if (task.priority === 'urgent') counts.urgent++;
      if (task.status === 'waiting') {
        counts.waiting++;
        if (task.waiting) counts.longestWait = Math.max(counts.longestWait, daysSince(task.waiting.since, now));
      }
      if ((days !== null && days < 0) || task.priority === 'urgent') needs = 'now';
      else if (days !== null && days <= DUE_SOON_DAYS && needs === 'later') needs = 'soon';
    }
    if (!Object.values(cells).some((c) => c.length)) continue;
    cells.todo.sort(byDue);
    cells.working.sort(byDue);
    cells.waiting.sort(byDue);
    cells.done.sort((a, b) => Date.parse(b.doneAt ?? '') - Date.parse(a.doneAt ?? ''));
    lanes.push({ project, cells, needs });
  }
  // Array.prototype.sort is stable: projects keep their own order within a rank.
  lanes.sort((a, b) => RANK[a.needs] - RANK[b.needs]);
  return { lanes, counts };
}
