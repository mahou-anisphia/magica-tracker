import { isInProgress, isProjectDone, isWaiting } from './completion';
import { domainOf } from './domains';
import { dayNumber, stampOf } from './period';
import type { HighlightFormat, Root } from './schema';
import type { Team } from './team';
import { localDateStamp } from './time';

/**
 * The weekly highlight: a prompt and a range's tasks as one block of text, to
 * paste into the company's assistant. Nothing is sent anywhere; the text is
 * only built here and copied. The prompt is a preset's body followed by the
 * base block, with {{week_range}}, {{max_items}} and {{word_limit}} filled in.
 * The prompt's words are English whatever the browser's locale, like the
 * form they end up in.
 */

/** Inclusive calendar days, "2026-10-19" to "2026-10-25". */
export type DateRange = { from: string; to: string };

export const DEFAULT_MAX_ITEMS = 3;
export const DEFAULT_WORD_LIMIT = 500;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** 0 for Monday … 6 for Sunday (day 0, 1 January 1970, was a Thursday). */
const weekday = (stamp: string) => (dayNumber(stamp) + 3) % 7;

/** Last Monday to Sunday: the week before the one `now` falls in. */
export function lastWeek(now: Date): DateRange {
  const today = localDateStamp(now);
  const monday = dayNumber(today) - weekday(today) - 7;
  return { from: stampOf(monday), to: stampOf(monday + 6) };
}

/** The same range moved by whole weeks. */
export function shiftRange(range: DateRange, weeks: number): DateRange {
  return { from: stampOf(dayNumber(range.from) + weeks * 7), to: stampOf(dayNumber(range.to) + weeks * 7) };
}

const parts = (stamp: string) => {
  const [y, m, d] = stamp.split('-').map(Number);
  return { y: y!, m: MONTHS[m! - 1]!, d: d! };
};

/** "19–25 Oct 2026", "27 Oct – 2 Nov 2026", "29 Dec 2025 – 4 Jan 2026", or one day. */
export function rangeLabel({ from, to }: DateRange): string {
  const a = parts(from);
  const b = parts(to);
  if (from === to) return `${b.d} ${b.m} ${b.y}`;
  if (a.y !== b.y) return `${a.d} ${a.m} ${a.y} – ${b.d} ${b.m} ${b.y}`;
  if (a.m !== b.m) return `${a.d} ${a.m} – ${b.d} ${b.m} ${b.y}`;
  return `${a.d}–${b.d} ${b.m} ${b.y}`;
}

/** "Thu 22 Oct". */
export function dayLabel(stamp: string): string {
  const p = parts(stamp);
  return `${WEEKDAYS[weekday(stamp)]} ${p.d} ${p.m}`;
}

// ─── Presets ─────────────────────────────────────────────────────────────────

/**
 * The presets everyone has. They live here rather than in the data, so they
 * can be improved without touching anyone's file; to change one, duplicate it.
 * `inProgress` presets ask for in-progress work, so picking one includes it.
 */
export const BUILT_IN_PRESETS: { id: string; name: string; body: string; format: HighlightFormat; inProgress?: boolean }[] = [
  {
    id: 'standard',
    name: 'Standard',
    body: 'Pick the 2-3 most significant items. Favour completed deliverables over routine work.',
    format: 'bullets',
  },
  {
    id: 'impact',
    name: 'Impact-first',
    body: "Frame each item by its effect: risk reduced, decision enabled, gap closed, team unblocked. If the impact isn't stated, describe the deliverable plainly.",
    format: 'bullets',
  },
  {
    id: 'in-flight',
    name: 'Shipped + in-flight',
    body: 'Give 2 completed items, then 1 in-progress item written as "Progressing: ...".',
    format: 'bullets',
    inProgress: true,
  },
  {
    id: 'plain',
    name: 'Plain language',
    body: 'Use no security jargon or acronyms. Write for a non-technical manager.',
    format: 'bullets',
  },
  {
    id: 'one-liner',
    name: 'One-liner',
    body: 'Summarise the week in a single sentence, with the items separated by semicolons.',
    format: 'sentence',
  },
];

/** Something the preset picker offers: built in, one of yours, or one a teammate shared in their file. */
export type PresetChoice = {
  /** "built-in:standard", "mine:<id>", or "team:<member id>:<id>". */
  key: string;
  name: string;
  body: string;
  format: HighlightFormat;
  source: 'built-in' | 'mine' | 'team';
  /** Whose it is, for a teammate's. */
  owner?: string;
  inProgress?: boolean;
};

export const DEFAULT_PRESET = 'built-in:standard';

/** Every preset to pick from: built in, then yours, then what your team shared, by member. */
export function presetChoices(root: Root, team: Team): PresetChoice[] {
  const out: PresetChoice[] = BUILT_IN_PRESETS.map((p) => ({ ...p, key: `built-in:${p.id}`, source: 'built-in' }));
  for (const h of root.highlightPresets ?? []) {
    out.push({ key: `mine:${h.id}`, name: h.name, body: h.body, format: h.format, source: 'mine' });
  }
  for (const m of team.members) {
    for (const h of m.snapshot?.root.highlightPresets ?? []) {
      if (h.shared) out.push({ key: `team:${m.id}:${h.id}`, name: h.name, body: h.body, format: h.format, source: 'team', owner: m.name });
    }
  }
  return out;
}

/** Both numbers are caps, not targets: fewer bullet points or words is fine. */
const FORMAT_LINE: Record<HighlightFormat, string> = {
  bullets: 'Return at most {{max_items}} bullet points and at most {{word_limit}} words in total.',
  sentence: 'Return a single sentence of at most {{word_limit}} words.',
};

/**
 * Added after every preset: what to write, in what shape, and the rules. The
 * shape is the preset's format, so a one-sentence preset isn't asked for
 * bullet points as well.
 */
export function baseBlock(format: HighlightFormat): string {
  const item = format === 'bullets' ? 'bullet' : 'item';
  return [
    'Write a weekly highlight for {{week_range}} from the tasks below.',
    FORMAT_LINE[format],
    `Start each ${item} with what was achieved, not the activity.`,
    'Use plain past tense and no filler like "worked on" or "helped with".',
    `Combine small related tasks into one ${item}.`,
    "Do not invent details that aren't in the task data.",
  ].join(' ');
}

/** Fills {{name}} from `vars`; a name it doesn't know is left as written. */
export function fillVariables(text: string, vars: Record<string, string | number>): string {
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (all, name: string) => (name in vars ? String(vars[name]) : all));
}

// ─── Tasks ───────────────────────────────────────────────────────────────────

export type HighlightStatus = 'done' | 'working' | 'waiting';

/** One line of the task list. Events have no project or task id. */
export type HighlightItem = {
  key: string;
  status: HighlightStatus;
  title: string;
  /** "Wards (Security)": the project, and its domain when it has one. */
  project?: string;
  /** The calendar day it was done. */
  doneOn?: string;
  outcome?: string;
  waitingOn?: string;
  projectId?: string;
  taskId?: string;
};

/**
 * What the range holds: tasks and events done in it, oldest first, then (with
 * `inProgress`) tasks Working or Waiting now in active projects, in your
 * project order. A task done in a project since archived or marked done still
 * counts; it was done that week.
 */
export function highlightItems(root: Root, range: DateRange, inProgress: boolean): HighlightItem[] {
  const done: { item: HighlightItem; at: number }[] = [];
  const open: HighlightItem[] = [];
  const doneOn = (iso: string | undefined) => {
    const day = iso ? localDateStamp(new Date(iso)) : '';
    return day >= range.from && day <= range.to ? day : null;
  };
  for (const p of root.projects) {
    const domain = domainOf(root, p);
    const project = domain ? `${p.name} (${domain.name})` : p.name;
    const active = !p.archived && !isProjectDone(p);
    for (const t of p.tasks) {
      const base = { key: t.id, title: t.title, project, projectId: p.id, taskId: t.id, ...(t.outcome ? { outcome: t.outcome } : {}) };
      const day = t.done ? doneOn(t.doneAt) : null;
      if (day) done.push({ item: { ...base, status: 'done', doneOn: day }, at: Date.parse(t.doneAt!) });
      else if (inProgress && active && isInProgress(t)) open.push({ ...base, status: 'working' });
      else if (inProgress && active && isWaiting(t)) open.push({ ...base, status: 'waiting', ...(t.waiting?.on ? { waitingOn: t.waiting.on } : {}) });
    }
  }
  for (const e of root.calendar ?? []) {
    const day = e.kind === 'event' && e.done ? doneOn(e.doneAt) : null;
    if (day) done.push({ item: { key: e.id, status: 'done', title: e.title, doneOn: day }, at: Date.parse(e.doneAt!) });
  }
  done.sort((a, b) => a.at - b.at);
  return [...done.map((d) => d.item), ...open];
}

const STATUS_WORD: Record<HighlightStatus, string> = { done: 'Done', working: 'In progress', waiting: 'Waiting' };

/** "- Done | Rotate ward keys | Project: Wards | Done Thu 22 Oct | Outcome: …", leaving out what's empty. */
export function itemLine(i: HighlightItem): string {
  const fields = [
    STATUS_WORD[i.status],
    i.title,
    i.project && `Project: ${i.project}`,
    i.doneOn && `Done ${dayLabel(i.doneOn)}`,
    i.waitingOn && `Waiting on: ${i.waitingOn}`,
    i.outcome && `Outcome: ${i.outcome}`,
  ];
  return `- ${fields.filter(Boolean).join(' | ')}`;
}

export type PromptInput = {
  body: string;
  format: HighlightFormat;
  range: DateRange;
  maxItems: number;
  wordLimit: number;
  items: HighlightItem[];
};

/** The text to paste: the prompt (preset body, then the base block), then the tasks. */
export function buildPrompt(input: PromptInput): string {
  const range = rangeLabel(input.range);
  const vars = { week_range: range, max_items: input.maxItems, word_limit: input.wordLimit };
  const prompt = [input.body.trim(), baseBlock(input.format)].filter(Boolean).map((t) => fillVariables(t, vars));
  return ['[PROMPT]', prompt.join('\n\n'), '', `[TASKS — ${range}]`, ...input.items.map(itemLine)].join('\n');
}
