import { isProjectDone } from './completion';
import { daysUntil, DUE_SOON_DAYS } from './due';
import type { Project, Root, Status, Task } from './schema';
import { daysSince } from './time';

/**
 * The Board: every active project as a lane, its tasks in columns by status,
 * in the project's own order (which dragging a card sets).
 * Done shows only the last few days, so it shows progress without growing
 * forever. Lanes follow the project order (dragging a lane sets it); `needs`
 * marks the ones with something overdue or urgent (now) or due soon.
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
    // Open columns keep the project's own order, which dragging sets.
    cells.done.sort((a, b) => Date.parse(b.doneAt ?? '') - Date.parse(a.doneAt ?? ''));
    lanes.push({ project, cells, needs });
  }
  return { lanes, counts };
}
