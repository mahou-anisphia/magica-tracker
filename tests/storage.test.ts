import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadData } from '../src/storage/data';
import { openKv } from '../src/storage/idb';
import { STORAGE_KEY } from '../src/storage/local';
import { emptyRoot } from '../src/core/schema';
import { project, root } from './fixtures';

/** A Map-backed localStorage, enough for the storage module. */
class MemoryStorage {
  private m = new Map<string, string>();
  getItem(k: string) {
    return this.m.has(k) ? this.m.get(k)! : null;
  }
  setItem(k: string, v: string) {
    this.m.set(k, String(v));
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
  keys() {
    return [...this.m.keys()];
  }
}

let local: MemoryStorage;
beforeEach(() => {
  local = new MemoryStorage();
  (globalThis as { localStorage?: unknown }).localStorage = local;
});
afterEach(() => {
  delete (globalThis as { localStorage?: unknown }).localStorage;
});

describe('loadData', () => {
  it('starts fresh in IndexedDB when nothing is saved anywhere', async () => {
    const loaded = await loadData(new IDBFactory());
    expect(loaded.persistence.backend).toBe('indexeddb');
    expect(loaded.canSave).toBe(true);
    expect(loaded.root.projects).toEqual([]);
    expect(loaded.persistence.migratedAt).toBeUndefined();
  });

  it('copies localStorage data into IndexedDB once and leaves the original as a backup', async () => {
    const saved = root({ projects: [project('p1')] });
    local.setItem(STORAGE_KEY, JSON.stringify(saved));
    const idb = new IDBFactory();

    const first = await loadData(idb);
    expect(first.persistence.backend).toBe('indexeddb');
    expect(first.root.projects.map((p) => p.id)).toEqual(['p1']);
    expect(first.persistence.migratedAt).toBeTypeOf('string');
    expect(local.getItem(STORAGE_KEY)).toBe(JSON.stringify(saved));

    // Later changes live in IndexedDB; localStorage is no longer read.
    await first.persistence.write(JSON.stringify(root({ projects: [project('p2')] })));
    const second = await loadData(idb);
    expect(second.root.projects.map((p) => p.id)).toEqual(['p2']);
    expect(second.persistence.migratedAt).toBe(first.persistence.migratedAt);
  });

  it('sets a corrupt IndexedDB record aside and starts fresh', async () => {
    const idb = new IDBFactory();
    const kv = (await openKv(idb))!;
    await kv.put('root', '{not json');
    const loaded = await loadData(idb);
    expect(loaded.root).toEqual(expect.objectContaining({ projects: [], backlog: [] }));
    expect(loaded.canSave).toBe(true);
    expect(loaded.notice).toMatch(/couldn't be read/);
  });

  it('falls back to localStorage when IndexedDB is missing', async () => {
    local.setItem(STORAGE_KEY, JSON.stringify(root({ projects: [project('p1')] })));
    const loaded = await loadData(undefined);
    expect(loaded.persistence.backend).toBe('localStorage');
    expect(loaded.root.projects.map((p) => p.id)).toEqual(['p1']);

    const next = JSON.stringify(emptyRoot());
    loaded.persistence.write(next);
    expect(local.getItem(STORAGE_KEY)).toBe(next);
  });
});
