import { describe, expect, it } from 'vitest';
import { attention, isExportStale, isQuiet, isStale, STALE_DAYS } from '../src/core/attention';
import { DAY_MS } from '../src/core/time';
import { project, root, subtask, task } from './fixtures';

const NOW = new Date('2026-09-28T12:00:00.000Z');
const ago = (days: number, extraMs = 0) => new Date(NOW.getTime() - days * DAY_MS - extraMs).toISOString();

describe('staleness', () => {
  it('uses a fixed 7-day threshold', () => {
    expect(STALE_DAYS).toBe(7);
  });

  it('a task last touched 7 days ago is stale; 6 days ago is not', () => {
    expect(isStale(task('a', { updatedAt: ago(7) }), NOW)).toBe(true);
    expect(isStale(task('b', { updatedAt: ago(6) }), NOW)).toBe(false);
    // 6 days and 23 hours is still 6 whole days.
    expect(isStale(task('c', { updatedAt: ago(6, 23 * 60 * 60 * 1000) }), NOW)).toBe(false);
  });

  it('done tasks are never stale', () => {
    expect(isStale(task('a', { updatedAt: ago(30), done: true, doneAt: ago(30) }), NOW)).toBe(false);
  });
});

describe('needs attention', () => {
  const r = root({
    projects: [
      project('p1', {
        tasks: [
          task('progress', { updatedAt: ago(1), subtasks: [subtask('s1', true), subtask('s2')] }),
          task('fresh', { updatedAt: ago(2) }),
          task('stale9', { updatedAt: ago(9) }),
        ],
      }),
      project('p2', {
        tasks: [
          task('progress2', { updatedAt: ago(0), subtasks: [subtask('s3', true), subtask('s4')] }),
          task('stale20', { updatedAt: ago(20) }),
        ],
      }),
      project('archived', {
        archived: true,
        tasks: [
          task('hidden', { updatedAt: ago(40), subtasks: [subtask('s5', true), subtask('s6')] }),
        ],
      }),
    ],
  });

  it('lists in-progress tasks and counts their projects, ignoring archived ones', () => {
    const a = attention(r, NOW);
    expect(a.inProgress.map((x) => x.task.id)).toEqual(['progress', 'progress2']);
    expect(a.inProgressProjects).toBe(2);
  });

  it('lists stale tasks stalest first, ignoring archived ones', () => {
    const a = attention(r, NOW);
    expect(a.stale.map((x) => [x.task.id, x.days])).toEqual([
      ['stale20', 20],
      ['stale9', 9],
    ]);
  });

  it('is empty for a quiet root', () => {
    const a = attention(root(), NOW);
    expect(a).toEqual({ inProgress: [], inProgressProjects: 0, due: [], urgent: [], stale: [] });
    expect(isQuiet(a)).toBe(true);
  });
});

describe('export staleness', () => {
  it('turns amber after 14 days, or when never exported', () => {
    expect(isExportStale(null, NOW)).toBe(true);
    expect(isExportStale(ago(14), NOW)).toBe(false);
    expect(isExportStale(ago(15), NOW)).toBe(true);
  });
});
