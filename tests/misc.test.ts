import { describe, expect, it } from 'vitest';
import { beforeImportFileName, exportFileName, exportJson } from '../src/core/exportFile';
import { dayHeading, monthHeading, relativeDays } from '../src/core/format';
import { newId } from '../src/core/id';
import { addBacklogItem, addResource, addSubtask, addTask, createProject, setSubtaskDone } from '../src/core/ops';
import { emptyRoot } from '../src/core/schema';
import { normalizeUrlInput, shortUrl } from '../src/core/url';
import { parseRootText } from '../src/core/validate';

describe('urls', () => {
  it('adds https:// to bare hosts and rejects nonsense', () => {
    expect(normalizeUrlInput('docs.example.com/x')).toBe('https://docs.example.com/x');
    expect(normalizeUrlInput('localhost:8080')).toBe('https://localhost:8080');
    expect(normalizeUrlInput('http://intranet/wiki')).toBe('http://intranet/wiki');
    expect(normalizeUrlInput('mailto:a@b.example')).toBe('mailto:a@b.example');
    expect(normalizeUrlInput('hello')).toBeNull();
    expect(normalizeUrlInput('javascript:alert(1)')).toBeNull();
    expect(normalizeUrlInput('   ')).toBeNull();
  });

  it('shortens for display', () => {
    expect(shortUrl('https://www.docs.example.com/threat/model/')).toBe('docs.example.com/threat/model');
    expect(shortUrl('https://example.com/')).toBe('example.com');
    expect(shortUrl(`https://example.com/${'a'.repeat(80)}`, 20)).toHaveLength(20);
  });
});

describe('ids', () => {
  it('are uuid-shaped, also without crypto.randomUUID', () => {
    expect(newId()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    const original = crypto.randomUUID;
    try {
      (crypto as { randomUUID?: unknown }).randomUUID = undefined;
      expect(newId()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    } finally {
      crypto.randomUUID = original;
    }
  });
});

describe('relative days', () => {
  const now = new Date('2026-09-28T12:00:00Z');
  it('reads naturally', () => {
    expect(relativeDays('2026-09-28T08:00:00Z', now)).toBe('today');
    expect(relativeDays('2026-09-27T08:00:00Z', now)).toBe('yesterday');
    expect(relativeDays('2026-09-25T12:00:00Z', now)).toBe('3 days ago');
    expect(relativeDays('2026-09-07T12:00:00Z', now)).toBe('3 weeks ago');
  });
});

describe('export → import round trip', () => {
  it('restores deep-equal data', () => {
    const t = '2026-09-20T10:00:00.000Z';
    let r = emptyRoot(t);
    r = createProject(r, 'p', 'Aegis', t);
    r = addTask(r, 'p', 't', 'Write threat model', t);
    r = addSubtask(r, 'p', 't', 's1', 'Outline', t);
    r = addSubtask(r, 'p', 't', 's2', 'Draft', t);
    r = setSubtaskDone(r, 'p', 't', 's1', true, t);
    r = addResource(r, { projectId: 'p', taskId: 't' }, 'r', { header: 'STRIDE', url: 'https://example.com/stride', note: 'ref' }, t);
    r = addBacklogItem(r, 'b', 'Look into passkeys', t, { notes: 'later', suggestedProjectId: 'p' });

    const file = exportJson(r, '2026-09-28T09:00:00.000Z');
    expect(JSON.parse(file)).toMatchObject({ schemaVersion: 2, exportedAt: '2026-09-28T09:00:00.000Z' });

    expect(parseRootText(file)).toStrictEqual({ ok: true, root: r });
  });

  it('names files by local date', () => {
    const d = new Date(2026, 8, 28, 9, 30, 12);
    expect(exportFileName(d)).toBe('magica-tracker-2026-09-28.json');
    expect(beforeImportFileName(d)).toBe('magica-tracker-before-import-2026-09-28-093012.json');
  });
});

describe('headings', () => {
  it('read "Sunday, 4 Oct" and "October, 2026"', () => {
    const d = new Date(2026, 9, 4, 12);
    expect(dayHeading(d, 'en-US')).toBe('Sunday, 4 Oct');
    expect(dayHeading(d, 'en-GB')).toBe('Sunday, 4 Oct');
    expect(monthHeading(d, 'en-US')).toBe('October, 2026');
  });
});
