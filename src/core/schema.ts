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

export const SCHEMA_VERSION = 1;

const Id = v.optional(v.pipe(v.string(), v.nonEmpty()), newId);
const Timestamp = v.pipe(
  v.string(),
  v.check((s) => !Number.isNaN(Date.parse(s))),
);
const Stamp = v.optional(Timestamp, nowIso);
/** A calendar day with no time or zone, e.g. "2026-10-03". */
const DueDate = v.optional(v.pipe(v.string(), v.check(isCalendarDate)));
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

export const TaskSchema = v.object({
  id: Id,
  title: Required,
  done: v.optional(v.boolean(), false),
  doneAt: v.optional(Timestamp),
  due: DueDate,
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
  due: DueDate,
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

export const RootSchema = v.object({
  schemaVersion: v.literal(SCHEMA_VERSION),
  updatedAt: Stamp,
  projects: v.optional(v.array(ProjectSchema), () => []),
  backlog: v.optional(v.array(BacklogItemSchema), () => []),
});

export type Subtask = v.InferOutput<typeof SubtaskSchema>;
export type Resource = v.InferOutput<typeof ResourceSchema>;
export type Task = v.InferOutput<typeof TaskSchema>;
export type Project = v.InferOutput<typeof ProjectSchema>;
export type BacklogItem = v.InferOutput<typeof BacklogItemSchema>;
export type Root = v.InferOutput<typeof RootSchema>;

export function emptyRoot(now: string = nowIso()): Root {
  return { schemaVersion: SCHEMA_VERSION, updatedAt: now, projects: [], backlog: [] };
}
