import type { DueItem } from '../../core/calendar';

export const panelDay = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });

export const parseDay = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y!, m! - 1, d!);
};

export function itemKey(it: DueItem): string {
  return it.subtask?.id ?? it.task?.id ?? `project-${it.project.id}`;
}

/**
 * Done items recede; urgent tasks fill with the primary colour; other
 * approaching or overdue items take the highlight; the rest sit on a chip.
 */
export function itemTone(it: DueItem): 'done' | 'urgent' | 'watch' | 'open' {
  if (it.done) return 'done';
  if (it.urgent) return 'urgent';
  return it.watch ? 'watch' : 'open';
}

export function where(it: DueItem): string {
  if (it.subtask && it.task) return `${it.task.title} · ${it.project.name}`;
  if (it.task) return it.project.name;
  return 'Project deadline';
}
