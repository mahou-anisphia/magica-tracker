import { describe, expect, it } from 'vitest';
import { exportJson } from '../src/core/exportFile';
import {
  addMember,
  addMemberFromFile,
  applyTeamFile,
  emptyTeam,
  escalations,
  fileVerdict,
  isOwnFile,
  matchMember,
  parseTeamText,
  readTeamFile,
  removeMember,
  updateMember,
  type TeamFile,
} from '../src/core/team';
import { T0, T1, T2, project, root, task } from './fixtures';

const alice = { id: 'owner-alice', name: 'Alice' };

function fileFor(exportedAt: string, owner: { id: string; name: string } | undefined = alice): TeamFile {
  const text = exportJson(root({ owner, projects: [project('p', { tasks: [task('t')] })] }), exportedAt);
  const read = readTeamFile('alice.json', text, T2);
  if (!read.ok) throw new Error(read.error);
  return read.file;
}

describe('team members', () => {
  it('adds people one at a time, refusing blanks and repeated names', () => {
    let t = addMember(emptyTeam(), 'a', ' Alice ', 'Optics', T0);
    t = addMember(t, 'b', 'alice', '', T0);
    t = addMember(t, 'c', '  ', '', T0);
    expect(t.members).toEqual([{ id: 'a', name: 'Alice', role: 'Optics', addedAt: T0 }]);
  });

  it('renames, clears a role, and removes', () => {
    let t = addMember(addMember(emptyTeam(), 'a', 'Alice', 'Optics', T0), 'b', 'Bram', '', T0);
    t = updateMember(t, 'a', { name: 'Bram', role: '' });
    expect(t.members[0]).toEqual({ id: 'a', name: 'Alice', addedAt: T0 });
    t = updateMember(t, 'a', { name: 'Alice K' });
    expect(t.members[0]!.name).toBe('Alice K');
    expect(removeMember(t, 'a').members.map((m) => m.id)).toEqual(['b']);
  });
});

describe('importing their files', () => {
  it('dates a file by its export time, or its last change without one', () => {
    expect(fileFor(T1).exportedAt).toBe(T1);
    const plain = readTeamFile('x.json', JSON.stringify(root({ updatedAt: T0 })), T2);
    expect(plain.ok && plain.file.exportedAt).toBe(T0);
    expect(readTeamFile('x.json', 'nope', T2)).toMatchObject({ ok: false, error: "This file isn't valid JSON." });
  });

  it('matches by name first, then by the profile id it learned', () => {
    let t = addMember(emptyTeam(), 'a', 'alice', '', T0);
    expect(matchMember(t, fileFor(T1).root)).toMatchObject({ member: { id: 'a' }, by: 'name' });
    t = applyTeamFile(t, 'a', fileFor(T1), T2);
    expect(t.members[0]!.ownerId).toBe('owner-alice');
    t = updateMember(t, 'a', { name: 'Alice Moon' });
    const renamed = fileFor(T2, { id: 'owner-alice', name: 'Alice M.' });
    expect(matchMember(t, renamed.root)).toMatchObject({ member: { id: 'a' }, by: 'profile' });
  });

  it('does not match a same-named member tied to someone else, or a file with no name', () => {
    let t = addMember(emptyTeam(), 'a', 'Alice', '', T0);
    t = applyTeamFile(t, 'a', fileFor(T1, { id: 'other', name: 'Alice' }), T2);
    expect(matchMember(t, fileFor(T1).root)).toBeNull();
    expect(matchMember(t, fileFor(T1, undefined).root)).toBeNull();
  });

  it('keeps only a newer file', () => {
    let t = addMember(emptyTeam(), 'a', 'Alice', '', T0);
    expect(fileVerdict(t.members[0], fileFor(T1))).toBe('first');
    t = applyTeamFile(t, 'a', fileFor(T1), T2);
    expect(fileVerdict(t.members[0], fileFor(T0))).toBe('older');
    expect(fileVerdict(t.members[0], fileFor(T1))).toBe('same');
    expect(applyTeamFile(t, 'a', fileFor(T0), T2)).toBe(t);
    const newer = applyTeamFile(t, 'a', fileFor(T2), T2);
    expect(newer.members[0]!.snapshot!.exportedAt).toBe(T2);
  });

  it('adds a member from a file, avoiding a taken name', () => {
    const t = addMemberFromFile(addMember(emptyTeam(), 'a', 'Alice', '', T0), 'b', fileFor(T1, { id: 'x', name: 'Alice' }), T2);
    expect(t.members[1]).toMatchObject({ id: 'b', name: 'Alice (2)', ownerId: 'x', snapshot: { exportedAt: T1 } });
  });

  it('spots your own export', () => {
    expect(isOwnFile(root({ owner: alice }), fileFor(T1))).toBe(true);
    expect(isOwnFile(root(), fileFor(T1))).toBe(false);
  });
});

describe('stored team', () => {
  it('round-trips, dropping only what no longer reads', () => {
    let t = addMember(addMember(emptyTeam(), 'a', 'Alice', '', T0), 'b', 'Bram', '', T0);
    t = applyTeamFile(t, 'a', fileFor(T1), T2);
    expect(parseTeamText(JSON.stringify(t))).toStrictEqual(t);

    const raw = JSON.parse(JSON.stringify(t));
    raw.members[0].snapshot.root = { schemaVersion: 99 };
    raw.members.push({ id: 'c' });
    const back = parseTeamText(JSON.stringify(raw))!;
    expect(back.members.map((m) => [m.id, !!m.snapshot])).toEqual([
      ['a', false],
      ['b', false],
    ]);
    expect(parseTeamText('{"members": 3}')).toBeNull();
    expect(parseTeamText('nope')).toBeNull();
  });
});

describe('escalations', () => {
  it('lists open flagged tasks in active projects, newest first', () => {
    const r = root({
      projects: [
        project('p', {
          tasks: [
            task('old', { escalation: { since: T0, by: 'Archive' } }),
            task('new', { escalation: { since: T1 } }),
            task('done', { done: true, doneAt: T1, escalation: { since: T1 } }),
          ],
        }),
        project('q', { archived: true, tasks: [task('x', { escalation: { since: T1 } })] }),
      ],
    });
    expect(escalations(r).map((e) => [e.task.id, e.by])).toEqual([
      ['new', undefined],
      ['old', 'Archive'],
    ]);
  });
});
