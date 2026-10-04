import { plural } from '../core/format';
import { beforeImportFileName, exportFileName, exportJson } from '../core/exportFile';
import { newId } from '../core/id';
import { mergeRoots } from '../core/merge';
import * as ops from '../core/ops';
import { addSample, isSampleId, removeSample } from '../core/sample';
import type { Project, Task } from '../core/schema';
import { parseRootText } from '../core/validate';
import { writeLastExport } from '../storage/local';
import { downloadText } from './download';
import { commit, confirmAction, getState, set, setMode, toast, update, updateWithUndo } from './store';

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

export function loadSample(): void {
  const before = getState().root;
  update((r) => addSample(r, new Date()));
  const first = getState().root.projects.find((p) => isSampleId(p.id) && !p.archived);
  if (first) openProject(first.id);
  // Undo only if nothing else changed meanwhile, like the other undo toasts.
  const after = getState().root;
  toast('Loaded sample data', {
    label: 'Undo',
    run: () => {
      if (getState().root === after) commit(before);
      set({ toast: null });
    },
  });
}

export async function wipeSample(): Promise<void> {
  const ok = await confirmAction({
    title: 'Wipe the sample data?',
    body: 'This removes every sample project, task and backlog item, including any changes made to them. Your own data stays.',
    confirmLabel: 'Wipe sample data',
  });
  if (!ok) return;
  update((r) => removeSample(r));
  set({ view: { kind: 'auto' }, expandedTaskId: null });
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
