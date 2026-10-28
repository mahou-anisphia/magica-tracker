import { plural } from '../core/format';
import { beforeImportFileName, exportFileName, exportJson } from '../core/exportFile';
import { newId } from '../core/id';
import { mergeRoots } from '../core/merge';
import * as ops from '../core/ops';
import { addSample, addSampleTeam, isSampleId, removeSample, removeSampleTeam } from '../core/sample';
import type { CalendarEntry, Domain, Project, Status, Task } from '../core/schema';
import { localDateStamp } from '../core/time';
import * as team from '../core/team';
import { parseRootText } from '../core/validate';
import { writeLastExport } from '../storage/local';
import { downloadText } from './download';
import { commit, confirmAction, getState, go, set, setMode, setTeam, toast, update, updateWithUndo, type TeamImportRow } from './store';

// ─── Navigation ──────────────────────────────────────────────────────────────

export function openProject(projectId: string, taskId: string | null = null): void {
  setMode('overview');
  set({ view: { kind: 'project', id: projectId }, expandedTaskId: taskId, drawerOpen: false });
  if (taskId) {
    requestAnimationFrame(() => {
      const row = document.querySelector<HTMLElement>(`[data-task-row="${CSS.escape(taskId)}"]`);
      row?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      row?.focus({ preventScroll: true });
    });
  }
}

/** Shows a day on the Timeline, with its side panel open. */
export function openDay(date: string): void {
  setMode('timeline');
  set({ day: date, adding: false });
}

/** Opens a day (today unless given) on the Timeline with "Add to this day" showing. */
export function startAddingEntry(date: string = localDateStamp(new Date())): void {
  setMode('timeline');
  set({ day: date, adding: true, palette: false });
}

// ─── Calendar entries ────────────────────────────────────────────────────────

export function addEntry(input: ops.EntryInput): void {
  const id = newId();
  update((r, now) => ops.addEntry(r, id, input, now));
}

export function saveEntry(id: string, input: ops.EntryInput): void {
  update((r, now) => ops.updateEntry(r, id, input, now));
}

export function toggleEntry(entry: CalendarEntry): void {
  update((r, now) => ops.setEntryDone(r, entry.id, !entry.done, now));
}

export function deleteEntry(entry: CalendarEntry): void {
  updateWithUndo(`Deleted “${entry.title}”`, (r) => ops.deleteEntry(r, entry.id));
}

// ─── Timesheet and working days ──────────────────────────────────────────────

export function setTimesheetDays(projectId: string, month: string, days: number): void {
  update((r, now) => ops.setTimesheetDays(r, projectId, month, days, now));
}

/** Gives every project this month what it had in `from`, with Undo. */
export function copyTimesheetMonth(from: string, to: string, label: string): void {
  updateWithUndo(`Copied ${label}’s days`, (r, now) => ops.copyTimesheetMonth(r, from, to, now));
}

export function setTrackingFrom(from: string | undefined): void {
  update((r, now) => ops.setWorkdays(r, { from: from ?? null }, now));
}

/** Weekdays are 1 (Monday) to 7 (Sunday). Working a weekend is allowed, but not without comment. */
export function setWeekdays(weekdays: number[], before: number[]): void {
  const weekend = weekdays.some((d) => d > 5 && !before.includes(d));
  if (!weekend) {
    update((r, now) => ops.setWorkdays(r, { weekdays }, now));
    return;
  }
  updateWithUndo('Working weekends? We don’t do that here.', (r, now) => ops.setWorkdays(r, { weekdays }, now));
}

/** An event becomes a task in a project, and the project opens on it. */
export function moveEntryToProject(entry: CalendarEntry, project: Project): void {
  update((r, now) => ops.moveEntryToProject(r, entry.id, project.id, now));
  toast(`Moved “${entry.title}” to ${project.name}`, { label: 'Open', run: () => openProject(project.id, entry.id) });
}

export function openBacklog(): void {
  setMode('overview');
  set({ view: { kind: 'backlog' }, expandedTaskId: null, drawerOpen: false });
}

export function focusShortcut(name: string): boolean {
  const el = document.querySelector<HTMLElement>(`[data-shortcut="${name}"]`);
  el?.focus();
  return !!el;
}

// ─── Projects ────────────────────────────────────────────────────────────────

/** The name a domain starts with, until you give it one. */
export const NEW_DOMAIN = 'New domain';

/** Makes an empty domain at the end; returns its id, to name it. */
export function addDomain(): string {
  const id = newId();
  update((r, now) => ops.createDomain(r, id, NEW_DOMAIN, now));
  return id;
}

/** Drops one project on another: a new domain with both. Returns its id, to name it. */
export function groupProjects(targetId: string, droppedId: string): string {
  const id = newId();
  update((r, now) => ops.groupProjects(r, id, NEW_DOMAIN, targetId, droppedId, now));
  return id;
}

/** Moves a project into a domain (undefined: none), before another or at the end. */
export function moveProject(projectId: string, domainId: string | undefined, beforeId: string | null): void {
  update((r, now) => ops.moveProject(r, projectId, domainId, beforeId, now));
}

/** Deletes a domain, with undo. Its projects stay, ungrouped. */
export function deleteDomain(domain: Domain): void {
  updateWithUndo(`Deleted the domain “${domain.name}”; its projects are ungrouped`, (r, now) => ops.deleteDomain(r, domain.id, now));
}

export function createProject(name: string): void {
  const id = newId();
  update((r, now) => ops.createProject(r, id, name, now));
  openProject(id);
  requestAnimationFrame(() => focusShortcut('new-task'));
}

export async function deleteProject(project: Project): Promise<void> {
  const ok = await confirmAction({
    title: `Delete “${project.name}”?`,
    body: `This removes the project with its ${plural(project.tasks.length, 'task')} and ${plural(project.resources.length, 'resource')}. Archiving keeps it out of sight without losing anything.`,
    confirmLabel: 'Delete project',
  });
  if (!ok) return;
  update((r) => ops.deleteProject(r, project.id));
  set({ view: { kind: 'auto' } });
}

/** A dragged list of projects (Board lanes, the project list) in its new order. */
export function reorderProjects(ids: string[]): void {
  update((r) => ops.reorderProjects(r, ids));
}

export function setArchived(project: Project, archived: boolean): void {
  update((r, now) => ops.setProjectArchived(r, project.id, archived, now));
  if (archived) {
    set({ view: { kind: 'auto' } });
    toast(`Archived “${project.name}”`, { label: 'Undo', run: () => setArchived(project, false) });
  } else {
    openProject(project.id);
  }
}

/** Mark a project done or reopen it. With open tasks left, ask first. */
export async function setProjectDone(project: Project, done: boolean): Promise<void> {
  const open = project.tasks.filter((t) => !t.done).length;
  if (done && open > 0) {
    const ok = await confirmAction({
      title: `Mark “${project.name}” done?`,
      body: `${plural(open, 'task is', 'tasks are')} still open. They stay as they are.`,
      confirmLabel: 'Mark done',
    });
    if (!ok) return;
  }
  update((r, now) => ops.setProjectDone(r, project.id, done, now));
}

// ─── Tasks ───────────────────────────────────────────────────────────────────

export function addTask(projectId: string, title: string): void {
  const id = newId();
  update((r, now) => ops.addTask(r, projectId, id, title, now));
}

/** The checkbox on a task row. Reopening a task with sub-tasks asks first. */
export async function toggleTask(projectId: string, task: Task, done: boolean): Promise<void> {
  if (!done && task.subtasks.length > 0) {
    const ok = await confirmAction({
      title: `Reopen “${task.title}”?`,
      body: `This unticks all ${plural(task.subtasks.length, 'sub-task')}.`,
      confirmLabel: 'Reopen all',
    });
    if (!ok) return;
  }
  update((r, now) => ops.setTaskDone(r, projectId, task.id, done, now));
}

/**
 * Move a task to another status. Leaving Done reopens it, which unticks its
 * sub-tasks, so that asks first, as unticking the checkbox does.
 */
export async function moveTask(projectId: string, task: Task, status: Status): Promise<void> {
  if (task.status === status) return;
  if (!(await confirmReopen(task, status))) return;
  update((r, now) => ops.setTaskStatus(r, projectId, task.id, status, now));
}

/** A board drop: a status and a place in the column, just before `beforeId` (or at the end). */
export async function placeTask(projectId: string, task: Task, status: Status, beforeId: string | null): Promise<void> {
  if (!(await confirmReopen(task, status))) return;
  update((r, now) => ops.moveTaskTo(r, projectId, task.id, status, beforeId, now));
}

async function confirmReopen(task: Task, status: Status): Promise<boolean> {
  if (!task.done || status === 'done' || task.subtasks.length === 0) return true;
  return confirmAction({
    title: `Reopen “${task.title}”?`,
    body: `This unticks all ${plural(task.subtasks.length, 'sub-task')}.`,
    confirmLabel: 'Reopen all',
  });
}

export async function deleteTask(projectId: string, task: Task): Promise<void> {
  const ok = await confirmAction({
    title: `Delete “${task.title}”?`,
    body:
      task.subtasks.length || task.resources.length
        ? `Its ${plural(task.subtasks.length, 'sub-task')} and ${plural(task.resources.length, 'resource')} go with it.`
        : undefined,
    confirmLabel: 'Delete task',
  });
  if (!ok) return;
  update((r, now) => ops.deleteTask(r, projectId, task.id, now));
  set({ expandedTaskId: null });
}

export async function demoteTask(projectId: string, task: Task): Promise<void> {
  const loses = task.subtasks.length + task.resources.length > 0;
  if (loses) {
    const ok = await confirmAction({
      title: `Send “${task.title}” to the backlog?`,
      body: `Its ${plural(task.subtasks.length, 'sub-task')} and ${plural(task.resources.length, 'resource')} will be dropped. Notes are kept.`,
      confirmLabel: 'Send to backlog',
    });
    if (!ok) return;
  }
  update((r, now) => ops.demote(r, projectId, task.id, now));
  set({ expandedTaskId: null });
  toast(`Moved “${task.title}” to the backlog`, { label: 'Open', run: openBacklog });
}

// ─── Backlog ─────────────────────────────────────────────────────────────────

export function addBacklogItem(title: string): void {
  const id = newId();
  update((r, now) => ops.addBacklogItem(r, id, title, now));
}

export function promote(itemId: string, project: Project): void {
  const item = getState().root.backlog.find((b) => b.id === itemId);
  if (!item) return;
  update((r, now) => ops.promote(r, itemId, project.id, now));
  toast(`Moved “${item.title}” to ${project.name}`, { label: 'Open', run: () => openProject(project.id, itemId) });
}

export function deleteBacklogItem(itemId: string, title: string): void {
  updateWithUndo(`Deleted “${title}”`, (r) => ops.deleteBacklogItem(r, itemId));
}

// ─── Sample data ─────────────────────────────────────────────────────────────

/** Sample projects in your tracker, and sample teammates in your team. */
export function loadSample(): void {
  const before = getState().root;
  const teamBefore = getState().team;
  const now = new Date();
  update((r) => addSample(r, now));
  setTeam(addSampleTeam(teamBefore, now));
  const teamAfter = getState().team;
  const first = getState().root.projects.find((p) => isSampleId(p.id) && !p.archived);
  if (first) openProject(first.id);
  // Undo only if nothing else changed meanwhile, like the other undo toasts.
  const after = getState().root;
  toast('Loaded sample data', {
    label: 'Undo',
    run: () => {
      if (getState().root === after) commit(before);
      if (getState().team === teamAfter) setTeam(teamBefore);
      set({ toast: null });
    },
  });
}

export async function wipeSample(): Promise<void> {
  const ok = await confirmAction({
    title: 'Wipe the sample data?',
    body: 'This removes every sample project, task and backlog item, including any changes made to them, and the sample teammates. Your own data and team stay.',
    confirmLabel: 'Wipe sample data',
  });
  if (!ok) return;
  update((r) => removeSample(r));
  setTeam(removeSampleTeam(getState().team));
  set({ view: { kind: 'auto' }, expandedTaskId: null });
}

/**
 * Clear every project and backlog item in this browser. A backup downloads
 * first, as with Replace import. Your name and settings stay.
 */
export async function wipeEverything(): Promise<void> {
  const ok = await confirmAction({
    title: 'Wipe everything in this browser?',
    body: 'Every project, task and backlog item goes. A backup file downloads first, so you can import it again. Your name and settings stay.',
    confirmLabel: 'Download backup and wipe',
  });
  if (!ok) return;
  const now = new Date();
  downloadText(beforeImportFileName(now), exportJson(getState().root, now.toISOString()));
  update((r) => ({ ...r, projects: [], backlog: [] }));
  set({ view: { kind: 'auto' }, expandedTaskId: null });
  toast('Wiped. The backup is in your downloads.');
}

// ─── Export / Import ─────────────────────────────────────────────────────────

export function exportNow(): void {
  const now = new Date();
  const iso = now.toISOString();
  downloadText(exportFileName(now), exportJson(getState().root, iso));
  writeLastExport(iso);
  set({ lastExportedAt: iso });
}

export async function startImport(file: File): Promise<void> {
  let text: string;
  try {
    text = await file.text();
  } catch {
    set({ importState: { kind: 'error', fileName: file.name, error: "The file couldn't be read." } });
    return;
  }
  const parsed = parseRootText(text);
  set({
    importState: parsed.ok
      ? { kind: 'preview', fileName: file.name, incoming: parsed.root }
      : { kind: 'error', fileName: file.name, error: parsed.error },
  });
}

export function applyImport(mode: 'replace' | 'merge'): void {
  const s = getState();
  if (s.importState?.kind !== 'preview') return;
  const { incoming } = s.importState;
  if (mode === 'replace') {
    const now = new Date();
    downloadText(beforeImportFileName(now), exportJson(s.root, now.toISOString()));
    commit(incoming, { touch: false });
  } else {
    commit(mergeRoots(s.root, incoming));
  }
  set({ importState: null, view: { kind: 'auto' }, expandedTaskId: null });
}

// ─── Team ────────────────────────────────────────────────────────────────────

/** Adds a person to the team. False (and nothing added) if the name is blank or taken. */
export function addTeamMember(name: string, role: string): boolean {
  const before = getState().team;
  const after = team.addMember(before, newId(), name, role, new Date().toISOString());
  setTeam(after);
  if (after === before) return false;
  toast(`Added ${name.trim()}. Ask them to export, then import their file.`);
  return true;
}

export function updateTeamMember(id: string, patch: { name?: string; role?: string }): void {
  setTeam(team.updateMember(getState().team, id, patch));
}

export async function removeTeamMember(member: team.Member): Promise<void> {
  const ok = await confirmAction({
    title: `Remove ${member.name} from the team?`,
    body: member.snapshot ? 'Their imported file goes too. Nothing changes on their side.' : undefined,
    confirmLabel: 'Remove',
  });
  if (ok) setTeam(team.removeMember(getState().team, member.id));
}

/** Who a newly read file should go to, before anyone chooses. */
function defaultAssign(read: team.TeamFileRead, forMember: string | undefined): string {
  if (!read.ok) return 'skip';
  const s = getState();
  if (team.isOwnFile(s.root, read.file)) return 'skip';
  const match = team.matchMember(s.team, read.file.root);
  if (match) return match.member.id;
  return forMember ?? '';
}

/**
 * Reads the chosen files and shows what importing them would do. With
 * `forMember`, a file that matches nobody goes to that member.
 */
export async function startTeamImport(files: Iterable<File>, forMember?: string): Promise<void> {
  const now = new Date().toISOString();
  const rows: TeamImportRow[] = [];
  let n = 0;
  for (const f of files) {
    let read: team.TeamFileRead;
    try {
      read = team.readTeamFile(f.name, await f.text(), now);
    } catch {
      read = { ok: false, fileName: f.name, error: "The file couldn't be read." };
    }
    rows.push({ key: `${++n}-${f.name}`, read, assign: defaultAssign(read, forMember) });
  }
  if (rows.length) set({ teamImport: rows });
}

export function assignTeamFile(key: string, assign: string): void {
  const rows = getState().teamImport;
  if (rows) set({ teamImport: rows.map((r) => (r.key === key ? { ...r, assign } : r)) });
}

/** Keeps each chosen file as its person's read-only copy. Older files change nothing. */
export function applyTeamImport(): void {
  const rows = getState().teamImport;
  if (!rows) return;
  const now = new Date().toISOString();
  const before = getState().team;
  let t = before;
  let kept = 0;
  // Oldest first, so when two files for one person arrive together the newer one wins.
  const files = rows.flatMap((r) => (r.read.ok && r.assign && r.assign !== 'skip' ? [{ file: r.read.file, assign: r.assign }] : []));
  files.sort((a, b) => Date.parse(a.file.exportedAt) - Date.parse(b.file.exportedAt));
  for (const { file, assign } of files) {
    const prev = t;
    if (assign === 'new') {
      // A second file for someone just added matches them now.
      const match = team.matchMember(t, file.root);
      t = match ? team.applyTeamFile(t, match.member.id, file, now) : team.addMemberFromFile(t, newId(), file, now);
    } else {
      t = team.applyTeamFile(t, assign, file, now);
    }
    if (t !== prev) kept++;
  }
  setTeam(t);
  set({ teamImport: null });
  toast(kept ? `Imported ${plural(kept, 'file')}` : 'Nothing new to import');
}

/** Opens a member's tracker, read-only. */
export function viewAs(memberId: string): void {
  set({ memberId });
  go('member');
}
