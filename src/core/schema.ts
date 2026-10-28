import * as v from 'valibot';
import { isCalendarDate, isCalendarMonth } from './due';
import { newId } from './id';
import { nowIso } from './time';
import { isSafeUrl } from './url';

/**
 * The data schema, defined once. The output types are the app's types; the
 * input side is what an import file may look like. Missing ids get fresh ones,
 * missing timestamps get "now", and missing arrays start empty.
 */

/**
 * 2 added optional fields only: deadlines (`due`) on projects, tasks and
 * sub-tasks, task `priority` and `effort`, project `doneAt`, and backlog `updatedAt`. A v1 file
 * is a valid v2 file; see MIGRATIONS[1].
 *
 * 3 added optional fields only: on tasks `startsOn`, `definitionOfDone`,
 * `relatedPeople`, `blocked` and `escalation`; on projects `definitionOfDone`
 * and `relatedPeople`; on the root `owner` (who the file belongs to) and
 * `settings` (allocation period and limit). A v2 file is a valid v3 file.
 *
 * 4 gave every task a `status` (To do, Working, Waiting, Done; To do when
 * missing) and replaced `blocked` with `waiting` (since when, and on what).
 * MIGRATIONS[3] works the status out from what a v3 task already says.
 *
 * 5 added optional fields only: `domains` on the root and `domainId` on
 * projects (projects grouped by domain), and `unit` in the allocation
 * settings (percent or hours). It also lets `effort` hold a fraction of a
 * percent, so an allocation entered in hours (10h of an 80h fortnight is
 * 12.5%) is kept exactly. A v4 file is a valid v5 file.
 *
 * 6 added optional fields only: `calendar` on the root (events, leave and
 * holidays, which belong to no project), `timesheet` on projects (whole days
 * given to the project per calendar month) and `workdays` in the settings
 * (when the timesheet starts, and which weekdays are worked). A v5 file is a
 * valid v6 file.
 */
export const SCHEMA_VERSION = 6;

export const ALLOCATION_PERIODS = ['week', 'fortnight'] as const;
export type AllocationPeriod = (typeof ALLOCATION_PERIODS)[number];

/** How allocation is shown and entered: percent of capacity, or hours (100% is HOURS_PER_WEEK a week). */
export const ALLOCATION_UNITS = ['percent', 'hours'] as const;
export type AllocationUnit = (typeof ALLOCATION_UNITS)[number];

export const PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;

/** Where a task stands. `done` mirrors it, for the completion rule. */
export const STATUSES = ['todo', 'working', 'waiting', 'done'] as const;
export type Status = (typeof STATUSES)[number];
export type Priority = (typeof PRIORITIES)[number];

/** What a calendar entry is: an event (a task with no project), or a day off. */
export const ENTRY_KINDS = ['event', 'leave', 'holiday'] as const;
export type EntryKind = (typeof ENTRY_KINDS)[number];

/** Weekdays as in ISO 8601: 1 is Monday, 7 is Sunday. */
export const DEFAULT_WEEKDAYS = [1, 2, 3, 4, 5];

const Id = v.optional(v.pipe(v.string(), v.nonEmpty()), newId);
const Timestamp = v.pipe(
  v.string(),
  v.check((s) => !Number.isNaN(Date.parse(s))),
);
const Stamp = v.optional(Timestamp, nowIso);
/** A calendar day with no time or zone, e.g. "2026-10-03". */
const DueDate = v.optional(v.pipe(v.string(), v.check(isCalendarDate)));
const PriorityField = v.optional(v.picklist(PRIORITIES));
/** A time of day, "09:30". */
const TimeOfDay = v.optional(v.pipe(v.string(), v.regex(/^([01]\d|2[0-3]):[0-5]\d$/)));
/**
 * Allocation: how much of your capacity this task takes in its period, in
 * percent (a fraction when it was entered in hours). Stored as `effort`; a
 * period's tasks add up on the dashboard, done or not.
 */
const Effort = v.optional(v.pipe(v.number(), v.finite(), v.minValue(0), v.maxValue(100)));
const Required = v.pipe(v.string(), v.trim(), v.nonEmpty());
const Optional = v.optional(v.string());
const Url = v.pipe(v.string(), v.trim(), v.check(isSafeUrl));

export const SubtaskSchema = v.object({
  id: Id,
  title: Required,
  done: v.optional(v.boolean(), false),
  doneAt: v.optional(Timestamp),
  due: DueDate,
});

export const ResourceSchema = v.object({
  id: Id,
  header: Required,
  url: Url,
  note: Optional,
  addedAt: Stamp,
});

/** Set while the task is waiting: since when, and optionally on what (a person, a meeting, evidence). */
const Waiting = v.optional(v.object({ since: Timestamp, on: Optional }));
/**
 * Set by the task's owner when another team may escalate them to their leader
 * over this task: since when, by whom, and why. A self-report, not a score.
 */
const Escalation = v.optional(v.object({ since: Timestamp, by: Optional, why: Optional }));

export const TaskSchema = v.object({
  id: Id,
  title: Required,
  done: v.optional(v.boolean(), false),
  doneAt: v.optional(Timestamp),
  status: v.optional(v.picklist(STATUSES), 'todo'),
  due: DueDate,
  /** Optional: spreads the task's allocation over the periods from here to `due`. */
  startsOn: DueDate,
  definitionOfDone: Optional,
  /** Free text: who to contact about this task. */
  relatedPeople: Optional,
  waiting: Waiting,
  escalation: Escalation,
  priority: PriorityField,
  effort: Effort,
  notes: Optional,
  createdAt: Stamp,
  updatedAt: Stamp,
  subtasks: v.optional(v.array(SubtaskSchema), () => []),
  resources: v.optional(v.array(ResourceSchema), () => []),
});

/** A group of projects, such as an area of work. Order is the list's order. */
export const DomainSchema = v.object({
  id: Id,
  name: Required,
  createdAt: Stamp,
  updatedAt: Stamp,
});

/** Whole days given to a project in one calendar month ("2026-10"), for the finance timesheet. */
export const TimesheetMonthSchema = v.object({
  month: v.pipe(v.string(), v.check(isCalendarMonth)),
  days: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(31)),
});

export const ProjectSchema = v.object({
  id: Id,
  name: Required,
  /** The domain it belongs to; none, or one that no longer exists, means ungrouped. */
  domainId: Optional,
  description: Optional,
  archived: v.optional(v.boolean(), false),
  /** Set when the project is marked done; absent while it is open. */
  doneAt: v.optional(Timestamp),
  due: DueDate,
  definitionOfDone: Optional,
  relatedPeople: Optional,
  createdAt: Stamp,
  updatedAt: Stamp,
  tasks: v.optional(v.array(TaskSchema), () => []),
  resources: v.optional(v.array(ResourceSchema), () => []),
  /** Absent until the project is given days; at most one entry per month. */
  timesheet: v.optional(v.array(TimesheetMonthSchema)),
});

/**
 * Something on the calendar that belongs to no project. An event is a task
 * without one: it can be ticked done and carry an allocation, landing like a
 * task with its date as the deadline (and `until`, the spread). Leave and
 * holidays are days off: they count toward the month's timesheet and lower
 * the period's capacity. Only events use `time`, `effort` and `done`.
 */
export const CalendarEntrySchema = v.object({
  id: Id,
  kind: v.picklist(ENTRY_KINDS),
  title: Required,
  date: v.pipe(v.string(), v.check(isCalendarDate)),
  /** The last day, for an entry over several days. */
  until: DueDate,
  time: TimeOfDay,
  effort: Effort,
  done: v.optional(v.boolean(), false),
  doneAt: v.optional(Timestamp),
  notes: Optional,
  createdAt: Stamp,
  updatedAt: Stamp,
});

export const BacklogItemSchema = v.object({
  id: Id,
  title: Required,
  notes: Optional,
  suggestedProjectId: Optional,
  createdAt: Stamp,
  // Not in the original sketch: lets a merge tell which copy of an edited item is newer.
  updatedAt: v.optional(Timestamp),
});

/** Who this file belongs to, so a team leader can match it to a member. */
const Owner = v.optional(v.object({ id: v.pipe(v.string(), v.nonEmpty()), name: Required }));

export const DEFAULT_MAX_LOAD = 150;

/** Per-person preferences that travel with the data, so a leader sees them as set. */
const Settings = v.optional(
  v.object({
    allocation: v.optional(
      v.object({
        period: v.optional(v.picklist(ALLOCATION_PERIODS), 'fortnight'),
        /** The most this person can carry in a period, in percent of capacity. */
        maxLoad: v.optional(v.pipe(v.number(), v.integer(), v.minValue(100), v.maxValue(300)), DEFAULT_MAX_LOAD),
        unit: v.optional(v.picklist(ALLOCATION_UNITS), 'percent'),
      }),
    ),
    /** The timesheet: from which day it counts (none: not kept), and the weekdays worked. */
    workdays: v.optional(
      v.object({
        from: DueDate,
        weekdays: v.optional(v.array(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(7))), () => [...DEFAULT_WEEKDAYS]),
      }),
    ),
  }),
);

export const RootSchema = v.object({
  schemaVersion: v.literal(SCHEMA_VERSION),
  updatedAt: Stamp,
  owner: Owner,
  settings: Settings,
  /** Absent until the first domain is made. */
  domains: v.optional(v.array(DomainSchema)),
  projects: v.optional(v.array(ProjectSchema), () => []),
  backlog: v.optional(v.array(BacklogItemSchema), () => []),
  /** Absent until the first entry is added. */
  calendar: v.optional(v.array(CalendarEntrySchema)),
});

export type Subtask = v.InferOutput<typeof SubtaskSchema>;
export type Resource = v.InferOutput<typeof ResourceSchema>;
export type Domain = v.InferOutput<typeof DomainSchema>;
export type Task = v.InferOutput<typeof TaskSchema>;
export type Project = v.InferOutput<typeof ProjectSchema>;
export type TimesheetMonth = v.InferOutput<typeof TimesheetMonthSchema>;
export type CalendarEntry = v.InferOutput<typeof CalendarEntrySchema>;
export type BacklogItem = v.InferOutput<typeof BacklogItemSchema>;
export type Root = v.InferOutput<typeof RootSchema>;
export type Owner = NonNullable<Root['owner']>;
export type AllocationSettings = { period: AllocationPeriod; maxLoad: number; unit: AllocationUnit };
export type WorkdaySettings = { from?: string; weekdays: number[] };

/** The allocation settings in force: the saved ones, or the defaults. */
export function allocationSettings(root: Root): AllocationSettings {
  const a = root.settings?.allocation;
  return { period: a?.period ?? 'fortnight', maxLoad: a?.maxLoad ?? DEFAULT_MAX_LOAD, unit: a?.unit ?? 'percent' };
}

/** The timesheet settings in force. Without `from` no timesheet is kept. */
export function workdaySettings(root: Root): WorkdaySettings {
  const w = root.settings?.workdays;
  const weekdays = [...new Set(w?.weekdays ?? DEFAULT_WEEKDAYS)].sort((a, b) => a - b);
  return { ...(w?.from ? { from: w.from } : {}), weekdays };
}

export function emptyRoot(now: string = nowIso()): Root {
  return { schemaVersion: SCHEMA_VERSION, updatedAt: now, projects: [], backlog: [] };
}
