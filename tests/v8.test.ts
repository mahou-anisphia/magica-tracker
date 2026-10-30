import { describe, expect, it } from 'vitest';
import {
  baseBlock,
  buildPrompt,
  dayLabel,
  fillVariables,
  highlightItems,
  itemLine,
  lastWeek,
  presetChoices,
  rangeLabel,
  shiftRange,
} from '../src/core/highlight';
import { mergeRoots } from '../src/core/merge';
import { migrate } from '../src/core/migrate';
import { createPreset, deletePreset, setTaskOutcome, updatePreset } from '../src/core/ops';
import { SCHEMA_VERSION } from '../src/core/schema';
import type { Team } from '../src/core/team';
import { parseRoot } from '../src/core/validate';
import { getTask, project, root, T0, T1, T2, task } from './fixtures';

// Noon, so the local calendar day is the same in every time zone the tests run in.
const at = (day: string) => new Date(`${day}T12:00:00`).toISOString();
const WEEK = { from: '2026-10-19', to: '2026-10-25' };

describe('schema 8', () => {
  it('reads every v7 file as it is', () => {
    const v7 = { schemaVersion: 7, projects: [{ id: 'p', name: 'x', tasks: [{ id: 't', title: 'y' }] }], backlog: [] };
    expect(migrate(v7)).toEqual({ ...v7, schemaVersion: SCHEMA_VERSION });
    expect(parseRoot(v7).ok).toBe(true);
  });

  it('wants a name and a body on a preset, and ids shared with nothing else', () => {
    const file = (highlightPresets: object[]) => parseRoot({ schemaVersion: 8, highlightPresets, projects: [{ id: 'x', name: 'P' }] });
    const ok = file([{ id: 'h', name: 'Mine', body: 'Be brief.' }]);
    expect(ok.ok && ok.root.highlightPresets![0]).toMatchObject({ format: 'bullets', shared: false });
    expect(file([{ id: 'h', name: 'Mine', body: '  ' }]).ok).toBe(false);
    expect(file([{ id: 'x', name: 'Mine', body: 'Be brief.' }])).toEqual({
      ok: false,
      error: "Two items share the id “x”: project 'P' and highlight preset 'Mine'.",
    });
  });

  it('merges presets by id, the newer copy winning', () => {
    const preset = (id: string, name: string, updatedAt: string) => ({ id, name, body: 'b', format: 'bullets' as const, shared: false, createdAt: T0, updatedAt });
    const current = root({ highlightPresets: [preset('a', 'mine', T2)] });
    const incoming = root({ highlightPresets: [preset('a', 'theirs', T1), preset('b', 'New', T0)] });
    expect(mergeRoots(current, incoming).highlightPresets!.map((h) => h.name)).toEqual(['mine', 'New']);
  });
});

describe('outcome', () => {
  it('is one line, and empty removes it', () => {
    let r = root({ projects: [project('p', { tasks: [task('t', { done: true, doneAt: T0 })] })] });
    r = setTaskOutcome(r, 'p', 't', '  Closed the gap\n in ward 3 ', T1);
    expect(getTask(r, 'p', 't')).toMatchObject({ outcome: 'Closed the gap in ward 3', updatedAt: T1 });
    r = setTaskOutcome(r, 'p', 't', ' ', T2);
    expect(getTask(r, 'p', 't').outcome).toBeUndefined();
  });
});

describe('presets', () => {
  it('are made, edited and deleted, and need a name and a body', () => {
    let r = root();
    r = createPreset(r, 'h', { name: ' Mine ', body: ' Be brief. ', shared: true }, T0);
    expect(r.highlightPresets).toEqual([{ id: 'h', name: 'Mine', body: 'Be brief.', format: 'bullets', shared: true, createdAt: T0, updatedAt: T0 }]);
    expect(createPreset(r, 'g', { name: '', body: 'x' }, T0)).toBe(r);
    r = updatePreset(r, 'h', { name: 'Mine', body: 'One line.', format: 'sentence' }, T1);
    expect(r.highlightPresets![0]).toMatchObject({ body: 'One line.', format: 'sentence', shared: false, createdAt: T0, updatedAt: T1 });
    expect(updatePreset(r, 'h', { name: 'Mine', body: '' }, T2)).toBe(r);
    expect(deletePreset(r, 'h').highlightPresets).toBeUndefined();
  });

  it('are offered built in, then yours, then what teammates shared', () => {
    const shared = { id: 's', name: 'Alice’s', body: 'b', format: 'bullets' as const, shared: true, createdAt: T0, updatedAt: T0 };
    const team: Team = {
      version: 1,
      members: [
        {
          id: 'm',
          name: 'Alice',
          addedAt: T0,
          snapshot: { root: root({ highlightPresets: [shared, { ...shared, id: 'q', shared: false }] }), exportedAt: T0, importedAt: T0, fileName: 'a.json' },
        },
      ],
    };
    const r = createPreset(root(), 'h', { name: 'Mine', body: 'b' }, T0);
    const keys = presetChoices(r, team).map((c) => `${c.key}${c.owner ? ` (${c.owner})` : ''}`);
    expect(keys).toEqual([
      'built-in:standard',
      'built-in:impact',
      'built-in:in-flight',
      'built-in:plain',
      'built-in:one-liner',
      'mine:h',
      'team:m:s (Alice)',
    ]);
  });
});

describe('the weekly highlight', () => {
  it('defaults to last Monday to Sunday, and steps by weeks', () => {
    expect(lastWeek(new Date(2026, 9, 30, 9))).toEqual(WEEK); // a Friday
    expect(lastWeek(new Date(2026, 9, 26, 9))).toEqual(WEEK); // a Monday
    expect(lastWeek(new Date(2026, 9, 25, 23))).toEqual({ from: '2026-10-12', to: '2026-10-18' }); // a Sunday
    expect(shiftRange(WEEK, 1)).toEqual({ from: '2026-10-26', to: '2026-11-01' });
  });

  it('names ranges and days in English', () => {
    expect(rangeLabel(WEEK)).toBe('19–25 Oct 2026');
    expect(rangeLabel({ from: '2026-10-26', to: '2026-11-01' })).toBe('26 Oct – 1 Nov 2026');
    expect(rangeLabel({ from: '2025-12-29', to: '2026-01-04' })).toBe('29 Dec 2025 – 4 Jan 2026');
    expect(rangeLabel({ from: '2026-10-19', to: '2026-10-19' })).toBe('19 Oct 2026');
    expect(dayLabel('2026-10-22')).toBe('Thu 22 Oct');
  });

  it('fills the variables it knows, and asks for a shape the preset’s format agrees with', () => {
    expect(fillVariables('{{max_items}} of {{ char_limit }}, {{other}}', { max_items: 3, char_limit: 500 })).toBe('3 of 500, {{other}}');
    expect(baseBlock('bullets')).toContain('Return {{max_items}} bullet points, under {{char_limit}} characters in total.');
    expect(baseBlock('sentence')).not.toContain('bullet');
  });

  const sample = () =>
    root({
      domains: [{ id: 'd', name: 'Security', createdAt: T0, updatedAt: T0 }],
      projects: [
        project('p', {
          name: 'Wards',
          domainId: 'd',
          tasks: [
            task('late', { title: 'Rotate keys', done: true, doneAt: at('2026-10-23'), outcome: 'All 14 wards on new keys' }),
            task('early', { title: 'Audit list', done: true, doneAt: at('2026-10-20') }),
            task('before', { title: 'Old', done: true, doneAt: at('2026-10-18') }),
            task('w', { title: 'Draft policy', status: 'working' }),
            task('todo', { title: 'Later' }),
          ],
        }),
        project('q', { name: 'Archive', archived: true, tasks: [task('a', { title: 'Shelved', done: true, doneAt: at('2026-10-21') }), task('aw', { status: 'working' })] }),
        project('r', { name: 'Intake', tasks: [task('wait', { title: 'Sign-off', status: 'waiting', waiting: { since: T0, on: 'Bram' } })] }),
      ],
      calendar: [{ id: 'e', kind: 'event', title: 'Demo day', date: '2026-10-22', done: true, doneAt: at('2026-10-22'), createdAt: T0, updatedAt: T0 }],
    });

  it('lists what was done in the range oldest first, then what is in progress', () => {
    const titles = (inProgress: boolean) => highlightItems(sample(), WEEK, inProgress).map((i) => `${i.status} ${i.title}`);
    expect(titles(false)).toEqual(['done Audit list', 'done Shelved', 'done Demo day', 'done Rotate keys']);
    expect(titles(true)).toEqual(['done Audit list', 'done Shelved', 'done Demo day', 'done Rotate keys', 'working Draft policy', 'waiting Sign-off']);
  });

  it('writes each task on a line, leaving out what is empty', () => {
    const [audit, , demo, keys, , wait] = highlightItems(sample(), WEEK, true);
    expect(itemLine(audit!)).toBe('- Done | Audit list | Project: Wards (Security) | Done Tue 20 Oct');
    expect(itemLine(keys!)).toBe('- Done | Rotate keys | Project: Wards (Security) | Done Fri 23 Oct | Outcome: All 14 wards on new keys');
    expect(itemLine(demo!)).toBe('- Done | Demo day | Done Thu 22 Oct');
    expect(itemLine(wait!)).toBe('- Waiting | Sign-off | Project: Intake | Waiting on: Bram');
  });

  it('builds the prompt, then the tasks', () => {
    const items = highlightItems(sample(), WEEK, false).slice(0, 1);
    const text = buildPrompt({ body: 'Pick {{max_items}}.', format: 'bullets', range: WEEK, maxItems: 2, charLimit: 300, items });
    expect(text).toBe(
      [
        '[PROMPT]',
        'Pick 2.',
        '',
        'Write a weekly highlight for 19–25 Oct 2026 from the tasks below. Return 2 bullet points, under 300 characters in total. Start each bullet with what was achieved, not the activity. Use plain past tense and no filler like "worked on" or "helped with". Combine small related tasks into one bullet. Do not invent details that aren\'t in the task data.',
        '',
        '[TASKS — 19–25 Oct 2026]',
        '- Done | Audit list | Project: Wards (Security) | Done Tue 20 Oct',
      ].join('\n'),
    );
  });
});
