import * as v from 'valibot';
import { normalizeRoot } from './completion';
import { MigrationError, migrate } from './migrate';
import { RootSchema, type Root } from './schema';
import { nowIso } from './time';

export type ParseResult = { ok: true; root: Root } | { ok: false; error: string };

/**
 * The one path from untrusted data to a Root, used for imports and for what is
 * read back from storage: migrate → validate shape → unique ids → apply the
 * completion rule. Never throws.
 */
export function parseRoot(raw: unknown, now: string = nowIso()): ParseResult {
  let migrated: unknown;
  try {
    migrated = migrate(raw);
  } catch (e) {
    if (e instanceof MigrationError) return { ok: false, error: e.message };
    throw e;
  }

  const result = v.safeParse(RootSchema, migrated);
  if (!result.success) {
    const [first, ...rest] = result.issues;
    const more = rest.length ? ` (and ${rest.length} more ${rest.length === 1 ? 'problem' : 'problems'})` : '';
    return { ok: false, error: describeIssue(first) + more };
  }

  const duplicate = findDuplicateId(result.output);
  if (duplicate) return { ok: false, error: duplicate };

  return { ok: true, root: normalizeRoot(result.output, now) };
}

export function parseRootText(text: string, now: string = nowIso()): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "This file isn't valid JSON." };
  }
  return parseRoot(raw, now);
}

// ─── Readable errors ─────────────────────────────────────────────────────────

type Kind = { noun: string; nameField: string };

const KINDS: Record<string, Kind> = {
  projects: { noun: 'project', nameField: 'name' },
  tasks: { noun: 'task', nameField: 'title' },
  subtasks: { noun: 'sub-task', nameField: 'title' },
  resources: { noun: 'resource', nameField: 'header' },
  backlog: { noun: 'backlog item', nameField: 'title' },
};

const FIELD_NOUNS: Record<string, string> = {
  name: 'a name',
  title: 'a title',
  header: 'a header',
  url: 'a URL',
  done: 'a done flag',
};

function entityLabel(collection: string, value: unknown, index: number): string {
  const kind = KINDS[collection] ?? { noun: collection, nameField: 'name' };
  const name =
    typeof value === 'object' && value !== null ? (value as Record<string, unknown>)[kind.nameField] : undefined;
  return typeof name === 'string' && name.trim()
    ? `${kind.noun} '${name.trim()}'`
    : `${kind.noun} #${index + 1}`;
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "Task 'Write threat model' in project 'Aegis' is missing a title" */
export function describeIssue(issue: v.BaseIssue<unknown> | undefined): string {
  if (!issue) return 'The file could not be read.';
  const path = issue.path ?? [];
  const entities: string[] = [];
  let field: string | undefined;

  for (let i = 0; i < path.length; i++) {
    const seg = path[i]!;
    if (typeof seg.key !== 'string') continue;
    const next = path[i + 1];
    if (next && typeof next.key === 'number') {
      entities.push(entityLabel(seg.key, next.value, next.key));
      i++;
    } else {
      field = seg.key;
    }
  }

  const subject = entities.length
    ? capitalize([...entities].reverse().join(' in '))
    : 'The file';

  if (!field) {
    return entities.length ? `${subject} is not a valid entry.` : "This doesn't look like a Magica Tracker file.";
  }
  if (issue.input === undefined) {
    return `${subject} is missing ${FIELD_NOUNS[field] ?? `“${field}”`}.`;
  }
  if (issue.type === 'non_empty') {
    return `${subject} has an empty ${field}.`;
  }
  if (field === 'url' && issue.type === 'check') {
    return `${subject} has an invalid URL (“${String(issue.input)}”).`;
  }
  if (issue.type === 'check') {
    return `${subject} has an invalid date in “${field}” (“${String(issue.input)}”).`;
  }
  return `${subject} has an invalid “${field}” (expected ${issue.expected ?? 'something else'}).`;
}

function* labelledIds(root: Root): Generator<[id: string, label: string]> {
  for (const p of root.projects) {
    yield [p.id, `project '${p.name}'`];
    for (const r of p.resources) yield [r.id, `resource '${r.header}'`];
    for (const t of p.tasks) {
      yield [t.id, `task '${t.title}'`];
      for (const s of t.subtasks) yield [s.id, `sub-task '${s.title}'`];
      for (const r of t.resources) yield [r.id, `resource '${r.header}'`];
    }
  }
  for (const b of root.backlog) yield [b.id, `backlog item '${b.title}'`];
}

function findDuplicateId(root: Root): string | null {
  const seen = new Map<string, string>();
  for (const [id, label] of labelledIds(root)) {
    const prior = seen.get(id);
    if (prior) return `Two items share the id “${id}”: ${prior} and ${label}.`;
    seen.set(id, label);
  }
  return null;
}

export function counts(root: Root): { projects: number; tasks: number; backlog: number } {
  return {
    projects: root.projects.length,
    tasks: root.projects.reduce((n, p) => n + p.tasks.length, 0),
    backlog: root.backlog.length,
  };
}
