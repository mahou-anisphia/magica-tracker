import { describe, expect, it } from 'vitest';
import { MigrationError, migrate } from '../src/core/migrate';

describe('migrate', () => {
  it('passes current-version data through', () => {
    const raw = { schemaVersion: 2, projects: [], backlog: [] };
    expect(migrate(raw)).toEqual(raw);
  });

  it('upgrades v1 to v2 without changing anything else', () => {
    const raw = { schemaVersion: 1, projects: [{ id: 'p', name: 'x' }], backlog: [] };
    expect(migrate(raw)).toEqual({ ...raw, schemaVersion: 2 });
  });

  it('refuses files from a newer version', () => {
    expect(() => migrate({ schemaVersion: 3 })).toThrow(MigrationError);
    expect(() => migrate({ schemaVersion: 3 })).toThrow(/newer version/);
  });

  it('refuses things that are not tracker files', () => {
    expect(() => migrate(null)).toThrow(MigrationError);
    expect(() => migrate('x')).toThrow(MigrationError);
    expect(() => migrate({ schemaVersion: '1' })).toThrow(/no schemaVersion/);
  });

  it('applies steps in order up to the target version', () => {
    const steps = {
      1: (r: Record<string, unknown>) => ({ ...r, items: r.things, things: undefined }),
      2: (r: Record<string, unknown>) => ({ ...r, count: (r.items as unknown[]).length }),
    };
    expect(migrate({ schemaVersion: 1, things: ['a', 'b'] }, steps, 3)).toEqual({
      schemaVersion: 3,
      items: ['a', 'b'],
      things: undefined,
      count: 2,
    });
  });

  it('fails clearly when a step is missing', () => {
    expect(() => migrate({ schemaVersion: 1 }, {}, 2)).toThrow(/No upgrade path from schema version 1/);
  });
});
