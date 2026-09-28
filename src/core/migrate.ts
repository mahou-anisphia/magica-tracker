import { SCHEMA_VERSION } from './schema';

type Migration = (raw: Record<string, unknown>) => Record<string, unknown>;

/**
 * MIGRATIONS[n] upgrades a version-n object to version n+1.
 * Empty while only v1 exists. When v2 lands, add MIGRATIONS[1].
 */
export const MIGRATIONS: Record<number, Migration> = {};

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
