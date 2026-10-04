import { describe, expect, it } from 'vitest';
import { attention } from '../src/core/attention';
import { normalizeRoot } from '../src/core/completion';
import { dueByDate } from '../src/core/calendar';
import { addSample, hasSample, isSampleId, removeSample, sampleData } from '../src/core/sample';
import { parseRoot } from '../src/core/validate';
import { T0, project, root, task } from './fixtures';

const NOW = new Date(2026, 9, 4, 10, 0, 0);
const ids = (r: ReturnType<typeof root>) => [
  ...r.projects.flatMap((p) => [p.id, ...p.resources.map((x) => x.id), ...p.tasks.flatMap((t) => [t.id, ...t.subtasks.map((s) => s.id), ...t.resources.map((x) => x.id)])]),
  ...r.backlog.map((b) => b.id),
];

describe('sample data', () => {
  const sample = addSample(root(), NOW);

  it('is valid, already consistent with the completion rule, and every id is a sample id', () => {
    const parsed = parseRoot(JSON.parse(JSON.stringify(sample)));
    expect(parsed.ok).toBe(true);
    expect(normalizeRoot(sample, T0)).toEqual(sample);
    const all = ids(sample);
    expect(all.every(isSampleId)).toBe(true);
    expect(new Set(all).size).toBe(all.length);
  });

  it('shows off every state the UI has', () => {
    const a = attention(sample, NOW);
    expect(a.inProgress.length).toBeGreaterThan(0);
    expect(a.stale.length).toBeGreaterThan(0);
    const days = a.due.map((d) => d.days);
    expect(days.some((d) => d < 0)).toBe(true); // overdue
    expect(days).toContain(0); // due today
    expect(days.some((d) => d > 0)).toBe(true); // approaching
    expect(a.due.some((d) => !d.task)).toBe(true); // a project deadline
    expect(sample.projects.some((p) => p.archived)).toBe(true);
    expect(sample.projects.some((p) => p.tasks.some((t) => t.done))).toBe(true);
    expect(sample.backlog.length).toBeGreaterThan(0);
    expect(dueByDate(sample, NOW).size).toBeGreaterThan(5);
  });

  it('wiping removes only the samples, including sample tasks promoted into your projects', () => {
    const mine = project('mine', { tasks: [task('my-task'), { ...task('sample-task-99'), title: 'promoted sample' }] });
    const withSample = addSample(root({ projects: [mine], backlog: [{ id: 'my-idea', title: 'Mine', createdAt: T0 }] }), NOW);
    expect(hasSample(withSample)).toBe(true);
    const wiped = removeSample(withSample);
    expect(hasSample(wiped)).toBe(false);
    expect(wiped.projects.map((p) => p.id)).toEqual(['mine']);
    expect(wiped.projects[0]!.tasks.map((t) => t.id)).toEqual(['my-task']);
    expect(wiped.backlog.map((b) => b.id)).toEqual(['my-idea']);
  });

  it('loading twice replaces the first set instead of doubling it', () => {
    const twice = addSample(addSample(root(), NOW), NOW);
    expect(twice.projects).toHaveLength(sampleData(NOW).projects.length);
  });
});
