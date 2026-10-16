import { SCHEMA_VERSION } from './schema';

type Migration = (raw: Record<string, unknown>) => Record<string, unknown>;

const isObject = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);

/**
 * A v3 task's status, from what it already says: done, blocked (now
 * "waiting", keeping since when and on what), started (a sub-task done), or
 * not started yet.
 */
function taskV3toV4(task: unknown): unknown {
  if (!isObject(task)) return task;
  const { blocked, ...rest } = task;
  const subtasks = Array.isArray(rest.subtasks) ? rest.subtasks.filter(isObject) : [];
  const done = subtasks.length > 0 ? subtasks.every((s) => s.done === true) : rest.done === true;
  if (done) return { ...rest, status: 'done' };
  if (isObject(blocked)) {
    const on = typeof blocked.blocker === 'string' && blocked.blocker.trim() ? { on: blocked.blocker } : {};
    return { ...rest, status: 'waiting', waiting: { since: blocked.since, ...on } };
  }
  return { ...rest, status: subtasks.some((s) => s.done === true) ? 'working' : 'todo' };
}

/**
 * MIGRATIONS[n] upgrades a version-n object to version n+1. Every step must
 * accept any valid file of its version, and the result must validate as the
 * next version. Old data is never rejected for being old.
 */
export const MIGRATIONS: Record<number, Migration> = {
  /**
   * v1 → v2. v2 only added optional fields (deadlines, priority, effort,
   * project doneAt, backlog updatedAt), so every v1 file is already a valid v2 shape. The step
   * exists so the version is explicit: an older build of the tracker refuses a
   * v2 file instead of silently dropping fields it doesn't know.
   */
  1: (raw) => raw,
  /**
   * v2 → v3. Also only new optional fields (start date, definition of done,
   * related people, blocked, escalation, owner, settings), so a v2 file is
   * already a valid v3 shape.
   */
  2: (raw) => raw,
  /** v3 → v4. Every task gets a status, and `blocked` becomes `waiting`. */
  3: (raw) => ({
    ...raw,
    projects: Array.isArray(raw.projects)
      ? raw.projects.map((p) => (isObject(p) && Array.isArray(p.tasks) ? { ...p, tasks: p.tasks.map(taskV3toV4) } : p))
      : raw.projects,
  }),
  /**
   * v4 → v5. Only new optional fields (domains, a project's domain, the
   * allocation unit) and a wider `effort`, so a v4 file is already a valid v5
   * shape.
   */
  4: (raw) => raw,
};

export class MigrationError extends Error {}

/** Upgrade an older shape step by step to the current schemaVersion. */
export function migrate(raw: unknown, migrations: Record<number, Migration> = MIGRATIONS, target = SCHEMA_VERSION): unknown {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new MigrationError("This doesn't look like a Magica Tracker file.");
  }
  let data = raw as Record<string, unknown>;
  const version = data.schemaVersion;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    throw new MigrationError("This doesn't look like a Magica Tracker file (it has no schemaVersion).");
  }
  if (version > target) {
    throw new MigrationError(
      `This file was made by a newer version of Magica Tracker (schema ${version}; this one reads up to ${target}).`,
    );
  }
  for (let v = version; v < target; v++) {
    const step = migrations[v];
    if (!step) throw new MigrationError(`No upgrade path from schema version ${v}.`);
    data = { ...step(data), schemaVersion: v + 1 };
  }
  return data;
}
