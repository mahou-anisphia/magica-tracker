import { describe, expect, it } from 'vitest';
import { board } from '../src/core/board';
import { moveTaskTo } from '../src/core/ops';
import { project, root, task } from './fixtures';

const NOW = new Date(2026, 9, 13, 12);
const iso = (daysAgo: number) => new Date(NOW.getTime() - daysAgo * 86_400_000).toISOString();

describe('board', () => {
  const r = root({
    projects: [
      project('calm', { tasks: [task('c1'), task('c2', { status: 'working' })] }),
      project('soon', { tasks: [task('s1', { due: '2026-10-15' })] }),
      project('hot', {
        tasks: [
          task('h1', { due: '2026-10-10' }), // overdue
          task('h2', { priority: 'urgent', status: 'waiting', waiting: { since: iso(5), on: 'Dev team' } }),
          task('h3', { status: 'waiting', waiting: { since: iso(2) } }),
          task('h4', { done: true, doneAt: iso(1) }),
          task('h5', { done: true, doneAt: iso(9) }), // too old for Done
        ],
      }),
      project('empty'),
      project('old', { archived: true, tasks: [task('o1', { due: '2026-10-01' })] }),
      project('fin', { doneAt: iso(1), tasks: [task('f1')] }),
    ],
  });
  const { lanes, counts } = board(r, NOW);

  it('makes a lane per active project with something on it, the ones that need you first', () => {
    expect(lanes.map((l) => [l.project.id, l.needs])).toEqual([
      ['hot', 'now'],
      ['soon', 'soon'],
      ['calm', 'later'],
    ]);
  });

  it('puts tasks in columns by status, with only the last week of done', () => {
    const hot = lanes[0]!.cells;
    expect(hot.todo.map((t) => t.id)).toEqual(['h1']);
    expect(hot.waiting.map((t) => t.id)).toEqual(['h2', 'h3']);
    expect(hot.done.map((t) => t.id)).toEqual(['h4']);
    expect(lanes[2]!.cells.working.map((t) => t.id)).toEqual(['c2']);
  });

  it('moves a card to a column and a place, keeping the project order as the column order', () => {
    const ids = (x: ReturnType<typeof root>) => x.projects.find((p) => p.id === 'hot')!.tasks.map((t) => [t.id, t.status]);
    // h1 (To do) dropped in Waiting, before h3.
    let m = moveTaskTo(r, 'hot', 'h1', 'waiting', 'h3', '2026-10-13T12:00:00.000Z');
    expect(ids(m).slice(0, 3)).toEqual([
      ['h2', 'waiting'],
      ['h1', 'waiting'],
      ['h3', 'waiting'],
    ]);
    expect(board(m, NOW).lanes[0]!.cells.waiting.map((t) => t.id)).toEqual(['h2', 'h1', 'h3']);
    // Reordered within its column, to the end of it.
    m = moveTaskTo(m, 'hot', 'h2', 'waiting', null, '2026-10-13T12:00:00.000Z');
    expect(board(m, NOW).lanes[0]!.cells.waiting.map((t) => t.id)).toEqual(['h1', 'h3', 'h2']);
    // Dropping a card where it already is changes nothing.
    expect(moveTaskTo(m, 'hot', 'h3', 'waiting', 'h2', '2026-10-13T12:00:00.000Z')).toBe(m);
  });

  it('counts deadlines, urgency and waiting for the strip', () => {
    expect(counts).toEqual({ overdue: 1, dueSoon: 1, urgent: 1, waiting: 2, longestWait: 5 });
  });
});
