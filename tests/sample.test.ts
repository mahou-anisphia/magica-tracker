import { describe, expect, it } from 'vitest';
import { attention } from '../src/core/attention';
import { allocation } from '../src/core/progress';
import { normalizeRoot } from '../src/core/completion';
import { dueByDate } from '../src/core/calendar';
import { addSample, addSampleTeam, hasSample, hasSampleTeam, isSampleId, removeSample, removeSampleTeam, sampleData } from '../src/core/sample';
import { addMember, emptyTeam, escalations, FILE_STALE_DAYS, fileAgeDays, parseTeamText } from '../src/core/team';
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
    expect(a.waiting.length).toBeGreaterThan(0);
    const tasks = sample.projects.flatMap((p) => p.tasks);
    for (const key of ['definitionOfDone', 'relatedPeople', 'escalation', 'startsOn'] as const) {
      expect(tasks.some((t) => t[key] !== undefined)).toBe(true);
    }
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

describe('sample allocation', () => {
  it('is mildly overloaded on every day of a fortnight, so the bar always shows overload', () => {
    for (let d = 0; d < 14; d++) {
      const now = new Date(2026, 9, 5 + d, 12);
      const a = allocation(addSample(root(), now), now);
      expect(a.total).toBeGreaterThan(a.capacity);
      expect(a.total).toBeLessThan(a.limit);
    }
  });
});

describe('sample teammates', () => {
  const team = addSampleTeam(emptyTeam(), NOW);

  it('are valid, stored apart from your data, and all sample ids', () => {
    expect(parseTeamText(JSON.stringify(team))).toStrictEqual(team);
    expect(team.members.every((m) => isSampleId(m.id))).toBe(true);
    for (const m of team.members) {
      if (!m.snapshot) continue;
      expect(parseRoot(JSON.parse(JSON.stringify(m.snapshot.root))).ok).toBe(true);
      expect(m.snapshot.root.owner?.id).toBe(m.ownerId);
      const ids = m.snapshot.root.projects.flatMap((p) => [p.id, ...p.tasks.map((t) => t.id)]);
      expect(ids.every(isSampleId)).toBe(true);
    }
  });

  it('show every Observatory state: past limit, a flag, blocked, an old file and no file', () => {
    const withFile = team.members.filter((m) => m.snapshot);
    const past = withFile.filter((m) => {
      const a = allocation(m.snapshot!.root, NOW);
      return a.total > a.maxLoad;
    });
    expect(past.map((m) => m.name)).toEqual(['Bram']);
    expect(withFile.some((m) => escalations(m.snapshot!.root).length > 0)).toBe(true);
    expect(withFile.some((m) => attention(m.snapshot!.root, NOW).waiting.length > 0)).toBe(true);
    expect(withFile.some((m) => (fileAgeDays(m, NOW) ?? 0) > FILE_STALE_DAYS)).toBe(true);
    expect(team.members.some((m) => !m.snapshot)).toBe(true);
  });

  it('load twice without doubling, keep your own members (and their names), and wipe cleanly', () => {
    const own = addMember(emptyTeam(), 'mine', 'Alice', '', T0);
    const loaded = addSampleTeam(addSampleTeam(own, NOW), NOW);
    expect(loaded.members.map((m) => m.name)).toEqual(['Alice', 'Bram', 'Dara', 'Chiyo']);
    expect(hasSampleTeam(loaded)).toBe(true);
    expect(removeSampleTeam(loaded)).toEqual(own);
    expect(removeSampleTeam(own)).toBe(own);
  });
});
