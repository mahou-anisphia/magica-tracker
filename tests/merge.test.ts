import { describe, expect, it } from 'vitest';
import { mergeRoots } from '../src/core/merge';
import { parseRoot } from '../src/core/validate';
import { T0, T1, T2, backlogItem, idMaker, project, root, task } from './fixtures';

describe('merge import', () => {
  it('adds new projects and backlog items after the current ones', () => {
    const merged = mergeRoots(
      root({ projects: [project('a')], backlog: [backlogItem('x')] }),
      root({ projects: [project('b')], backlog: [backlogItem('y')] }),
    );
    expect(merged.projects.map((p) => p.id)).toEqual(['a', 'b']);
    expect(merged.backlog.map((b) => b.id)).toEqual(['x', 'y']);
  });

  it('on an id collision the newer updatedAt wins, in either direction', () => {
    const current = root({
      projects: [project('old-here', { name: 'current', updatedAt: T0 }), project('new-here', { name: 'current', updatedAt: T2 })],
    });
    const incoming = root({
      projects: [project('old-here', { name: 'incoming', updatedAt: T1 }), project('new-here', { name: 'incoming', updatedAt: T1 })],
    });
    const merged = mergeRoots(current, incoming);
    expect(merged.projects.map((p) => [p.id, p.name])).toEqual([
      ['old-here', 'incoming'],
      ['new-here', 'current'],
    ]);
  });

  it('a tie keeps the current copy', () => {
    const merged = mergeRoots(
      root({ projects: [project('p', { name: 'current' })] }),
      root({ projects: [project('p', { name: 'incoming' })] }),
    );
    expect(merged.projects[0]!.name).toBe('current');
  });

  it('backlog items compare updatedAt, falling back to createdAt', () => {
    const merged = mergeRoots(
      root({ backlog: [backlogItem('b', { title: 'current', createdAt: T0 })] }),
      root({ backlog: [backlogItem('b', { title: 'incoming', createdAt: T0, updatedAt: T1 })] }),
    );
    expect(merged.backlog).toHaveLength(1);
    expect(merged.backlog[0]!.title).toBe('incoming');
  });

  it('re-ids leftover collisions across different items so the result stays valid', () => {
    // Task "t" was promoted from backlog item "t"; the imported file still has the backlog item.
    const current = root({ projects: [project('p', { tasks: [task('t')] })] });
    const incoming = root({ backlog: [backlogItem('t')] });
    const merged = mergeRoots(current, incoming, idMaker());
    expect(merged.projects[0]!.tasks[0]!.id).toBe('t');
    expect(merged.backlog[0]!.id).toBe('new-1');
    expect(parseRoot(merged, T0).ok).toBe(true);
  });
});
