import { describe, expect, it } from 'vitest';
import { glanceLists } from '../src/core/glance';
import { stats } from '../src/core/progress';
import { addSample, addSampleTeam } from '../src/core/sample';
import { emptyTeam } from '../src/core/team';
import { project, root, subtask, task } from './fixtures';

// Tuesday 13 October 2026.
const NOW = new Date(2026, 9, 13, 12, 0, 0);

describe('glance lists', () => {
  it('list exactly what the numbers count, for you and for every sample teammate', () => {
    const roots = [addSample(root(), NOW), ...addSampleTeam(emptyTeam(), NOW).members.flatMap((m) => (m.snapshot ? [m.snapshot.root] : []))];
    for (const r of roots) {
      const s = stats(r, NOW);
      const l = glanceLists(r, NOW);
      expect([l.open.length, l.inProgress.length, l.waiting.length, l.overdue.length]).toEqual([s.open, s.inProgress, s.waiting, s.overdue]);
    }
  });

  it('put open work most pressing first, and keep your order for ties', () => {
    const r = root({
      projects: [
        project('p', {
          tasks: [
            task('plain'),
            task('soon', { due: '2026-10-14' }),
            task('later', { due: '2026-10-30' }),
            task('high', { priority: 'high' }),
            task('urgent', { priority: 'urgent', due: '2026-11-30' }),
            task('also-plain'),
            task('done', { done: true, doneAt: '2026-10-01T09:00:00Z' }),
          ],
        }),
        project('arch', { archived: true, tasks: [task('hidden')] }),
      ],
    });
    expect(glanceLists(r, NOW).open.map((x) => x.task!.id)).toEqual(['urgent', 'high', 'soon', 'later', 'plain', 'also-plain']);
  });

  it('put the longest waiting first, and the most overdue first, projects and sub-tasks included', () => {
    const r = root({
      projects: [
        project('p', {
          due: '2026-10-10',
          tasks: [
            task('w1', { status: 'waiting', waiting: { since: '2026-10-11T09:00:00Z' } }),
            task('w2', { status: 'waiting', waiting: { since: '2026-10-05T09:00:00Z' } }),
            task('late', { due: '2026-10-12' }),
            task('parent', { subtasks: [subtask('s', false, { due: '2026-10-01' })] }),
          ],
        }),
      ],
    });
    const l = glanceLists(r, NOW);
    expect(l.waiting.map((x) => x.task!.id)).toEqual(['w2', 'w1']);
    expect(l.overdue.map((x) => x.subtask?.id ?? x.task?.id ?? 'project')).toEqual(['s', 'project', 'late']);
  });
});
