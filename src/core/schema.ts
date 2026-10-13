import * as v from 'valibot';
import { isCalendarDate } from './due';
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
 */
export const SCHEMA_VERSION = 4;

export const ALLOCATION_PERIODS = ['week', 'fortnight'] as const;
export type AllocationPeriod = (typeof ALLOCATION_PERIODS)[number];

export const PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;

/** Where a task stands. `done` mirrors it, for the completion rule. */
export const STATUSES = ['todo', 'working', 'waiting', 'done'] as const;
export type Status = (typeof STATUSES)[number];
export type Priority = (typeof PRIORITIES)[number];

const Id = v.optional(v.pipe(v.string(), v.nonEmpty()), newId);
const Timestamp = v.pipe(
  v.string(),
  v.check((s) => !Number.isNaN(Date.parse(s))),
);
const Stamp = v.optional(Timestamp, nowIso);
/** A calendar day with no time or zone, e.g. "2026-10-03". */
const DueDate = v.optional(v.pipe(v.string(), v.check(isCalendarDate)));
const PriorityField = v.optional(v.picklist(PRIORITIES));
/**
 * Allocation: how much of your capacity this task takes while it's open, in
 * whole percent. Stored as `effort`; all open tasks add up on the dashboard.
 */
const Effort = v.optional(v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(100)));
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

export const ProjectSchema = v.object({
  id: Id,
  name: Required,
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
      }),
    ),
  }),
);

export const RootSchema = v.object({
  schemaVersion: v.literal(SCHEMA_VERSION),
  updatedAt: Stamp,
  owner: Owner,
  settings: Settings,
  projects: v.optional(v.array(ProjectSchema), () => []),
  backlog: v.optional(v.array(BacklogItemSchema), () => []),
});

export type Subtask = v.InferOutput<typeof SubtaskSchema>;
export type Resource = v.InferOutput<typeof ResourceSchema>;
export type Task = v.InferOutput<typeof TaskSchema>;
export type Project = v.InferOutput<typeof ProjectSchema>;
export type BacklogItem = v.InferOutput<typeof BacklogItemSchema>;
export type Root = v.InferOutput<typeof RootSchema>;
export type Owner = NonNullable<Root['owner']>;
export type AllocationSettings = { period: AllocationPeriod; maxLoad: number };

/** The allocation settings in force: the saved ones, or the defaults. */
export function allocationSettings(root: Root): AllocationSettings {
  const a = root.settings?.allocation;
  return { period: a?.period ?? 'fortnight', maxLoad: a?.maxLoad ?? DEFAULT_MAX_LOAD };
}

export function emptyRoot(now: string = nowIso()): Root {
  return { schemaVersion: SCHEMA_VERSION, updatedAt: now, projects: [], backlog: [] };
}
