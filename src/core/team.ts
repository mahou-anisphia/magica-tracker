import * as v from 'valibot';
import { isProjectDone } from './completion';
import { daysSince } from './time';
import { parseRoot } from './validate';
import type { Project, Root, Task } from './schema';

/**
 * The people you follow. Each member is added by hand, one at a time; their
 * data arrives later as the file they exported, kept here read-only. The team
 * is stored apart from your own data and never goes into your exports.
 */

/** A member's latest file, as it was exported. */
export type Snapshot = { root: Root; exportedAt: string; importedAt: string; fileName: string };

export type Member = {
  id: string;
  name: string;
  role?: string;
  addedAt: string;
  /** The `owner.id` in their files, learned from the first one imported. */
  ownerId?: string;
  snapshot?: Snapshot;
};

export type Team = { version: 1; members: Member[] };

/** A file older than this is flagged as getting old. */
export const FILE_STALE_DAYS = 7;

export function emptyTeam(): Team {
  return { version: 1, members: [] };
}

// ─── Reading what was stored ─────────────────────────────────────────────────

const Text = v.pipe(v.string(), v.trim(), v.nonEmpty());
const Timestamp = v.pipe(
  v.string(),
  v.check((s) => !Number.isNaN(Date.parse(s))),
);
const MemberSchema = v.object({
  id: Text,
  name: Text,
  role: v.optional(Text),
  addedAt: Timestamp,
  ownerId: v.optional(Text),
  snapshot: v.optional(
    v.object({ root: v.unknown(), exportedAt: Timestamp, importedAt: Timestamp, fileName: v.string() }),
  ),
});
const TeamSchema = v.object({ version: v.literal(1), members: v.array(v.unknown()) });

/**
 * The stored team, or null if it can't be read at all. A member that doesn't
 * parse is dropped, and so is a snapshot that no longer reads as a tracker
 * file (the member stays; their file can be imported again).
 */
export function parseTeam(raw: unknown): Team | null {
  const team = v.safeParse(TeamSchema, raw);
  if (!team.success) return null;
  const members: Member[] = [];
  for (const m of team.output.members) {
    const member = v.safeParse(MemberSchema, m);
    if (!member.success || members.some((x) => x.id === member.output.id)) continue;
    const { snapshot, ...rest } = member.output;
    const parsed = snapshot ? parseRoot(snapshot.root, snapshot.importedAt) : null;
    members.push(parsed?.ok ? { ...rest, snapshot: { ...snapshot!, root: parsed.root } } : rest);
  }
  return { version: 1, members };
}

export function parseTeamText(text: string): Team | null {
  try {
    return parseTeam(JSON.parse(text));
  } catch {
    return null;
  }
}

// ─── Members ─────────────────────────────────────────────────────────────────

const same = (a: string, b: string) => a.trim().toLocaleLowerCase() === b.trim().toLocaleLowerCase();

export function memberNamed(team: Team, name: string, except?: string): Member | undefined {
  return team.members.find((m) => m.id !== except && same(m.name, name));
}

/** Adds a person. A blank name, or one already in the team, changes nothing. */
export function addMember(team: Team, id: string, name: string, role: string, now: string): Team {
  const n = name.trim();
  if (!n || memberNamed(team, n)) return team;
  const r = role.trim();
  return { ...team, members: [...team.members, { id, name: n, ...(r ? { role: r } : {}), addedAt: now }] };
}

/** Renames a member or changes their role. A blank or taken name is ignored. */
export function updateMember(team: Team, id: string, patch: { name?: string; role?: string }): Team {
  const members = team.members.map((m) => {
    if (m.id !== id) return m;
    const next = { ...m };
    const n = patch.name?.trim();
    if (n && !memberNamed(team, n, id)) next.name = n;
    if (patch.role !== undefined) {
      const r = patch.role.trim();
      if (r) next.role = r;
      else delete next.role;
    }
    return next;
  });
  return { ...team, members };
}

export function removeMember(team: Team, id: string): Team {
  return { ...team, members: team.members.filter((m) => m.id !== id) };
}

// ─── Importing their files ───────────────────────────────────────────────────

/** An exported file, read and checked. */
export type TeamFile = { fileName: string; root: Root; exportedAt: string };

export type TeamFileRead = { ok: true; file: TeamFile } | { ok: false; fileName: string; error: string };

/**
 * Reads someone's export. `exportedAt` (written by Export) dates the file;
 * without it, the data's own last change does.
 */
export function readTeamFile(fileName: string, text: string, now: string): TeamFileRead {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, fileName, error: "This file isn't valid JSON." };
  }
  const parsed = parseRoot(raw, now);
  if (!parsed.ok) return { ok: false, fileName, error: parsed.error };
  const stamp = (raw as { exportedAt?: unknown }).exportedAt;
  const exportedAt = typeof stamp === 'string' && !Number.isNaN(Date.parse(stamp)) ? stamp : parsed.root.updatedAt;
  return { ok: true, file: { fileName, root: parsed.root, exportedAt } };
}

/**
 * Whose file this is: the member whose files carried the same profile id
 * before, or else the member with the name on the file (unless that member is
 * already tied to a different profile).
 */
export function matchMember(team: Team, root: Root): { member: Member; by: 'profile' | 'name' } | null {
  const owner = root.owner;
  if (!owner) return null;
  const byId = team.members.find((m) => m.ownerId === owner.id);
  if (byId) return { member: byId, by: 'profile' };
  const byName = team.members.find((m) => same(m.name, owner.name) && (!m.ownerId || m.ownerId === owner.id));
  return byName ? { member: byName, by: 'name' } : null;
}

/** Your own export, brought in by mistake. */
export function isOwnFile(mine: Root, file: TeamFile): boolean {
  return !!mine.owner && file.root.owner?.id === mine.owner.id;
}

/** What importing a file for a member would do: only a newer file replaces their copy. */
export type FileVerdict = 'first' | 'newer' | 'same' | 'older';

export function fileVerdict(member: Member | undefined, file: TeamFile): FileVerdict {
  const current = member?.snapshot;
  if (!current) return 'first';
  const a = Date.parse(file.exportedAt);
  const b = Date.parse(current.exportedAt);
  return a > b ? 'newer' : a === b ? 'same' : 'older';
}

/** Keeps the file as the member's copy, if it is their first or newer than the one held. */
export function applyTeamFile(team: Team, memberId: string, file: TeamFile, now: string): Team {
  const member = team.members.find((m) => m.id === memberId);
  const verdict = fileVerdict(member, file);
  if (!member || verdict === 'same' || verdict === 'older') return team;
  const ownerId = file.root.owner?.id ?? member.ownerId;
  const snapshot: Snapshot = { root: file.root, exportedAt: file.exportedAt, importedAt: now, fileName: file.fileName };
  return {
    ...team,
    members: team.members.map((m) => (m.id === memberId ? { ...m, ...(ownerId ? { ownerId } : {}), snapshot } : m)),
  };
}

/** The name a file suggests for a new member: the name on it, else the file's own name. */
export function suggestedName(file: TeamFile): string {
  return file.root.owner?.name ?? file.fileName.replace(/\.json$/i, '');
}

/** Adds the person a file belongs to, with the file as their copy. */
export function addMemberFromFile(team: Team, id: string, file: TeamFile, now: string): Team {
  let name = suggestedName(file);
  for (let i = 2; memberNamed(team, name); i++) name = `${suggestedName(file)} (${i})`;
  return applyTeamFile(addMember(team, id, name, '', now), id, file, now);
}

// ─── Reading a member's data ─────────────────────────────────────────────────

export function fileAgeDays(member: Member, now: Date): number | null {
  return member.snapshot ? daysSince(member.snapshot.exportedAt, now) : null;
}

/** An open task the person flagged "I may be escalated", in an active project. */
export type EscalationRef = { project: Project; task: Task; since: string; by?: string; why?: string };

export function escalations(root: Root): EscalationRef[] {
  const out: EscalationRef[] = [];
  for (const project of root.projects) {
    if (project.archived || isProjectDone(project)) continue;
    for (const task of project.tasks) {
      if (!task.done && task.escalation) out.push({ project, task, ...task.escalation });
    }
  }
  return out.sort((a, b) => Date.parse(b.since) - Date.parse(a.since));
}
