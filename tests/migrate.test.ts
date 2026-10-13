import { describe, expect, it } from 'vitest';
import { MigrationError, migrate } from '../src/core/migrate';

describe('migrate', () => {
  it('passes current-version data through', () => {
    const raw = { schemaVersion: 3, projects: [], backlog: [] };
    expect(migrate(raw)).toEqual(raw);
  });

  it('upgrades v1 and v2 to v3 without changing anything else', () => {
    const v1 = { schemaVersion: 1, projects: [{ id: 'p', name: 'x' }], backlog: [] };
    expect(migrate(v1)).toEqual({ ...v1, schemaVersion: 3 });
    const v2 = { schemaVersion: 2, projects: [{ id: 'p', name: 'x', due: '2026-10-01' }], backlog: [] };
    expect(migrate(v2)).toEqual({ ...v2, schemaVersion: 3 });
  });

  it('refuses files from a newer version', () => {
    expect(() => migrate({ schemaVersion: 4 })).toThrow(MigrationError);
    expect(() => migrate({ schemaVersion: 4 })).toThrow(/newer version/);
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
