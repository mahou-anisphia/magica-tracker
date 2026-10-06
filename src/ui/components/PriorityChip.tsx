import type { Priority } from '../../core/schema';

export const PRIORITY_LABEL: Record<Priority, string> = { urgent: 'Urgent', high: 'High', medium: 'Medium', low: 'Low' };

const TONE: Record<Priority, string> = { urgent: 'pill-urgent', high: 'pill-high', medium: 'pill-plain', low: 'pill-low' };

export function PriorityChip(props: { priority: Priority | undefined }) {
  if (!props.priority) return null;
  return <span class={`pill ${TONE[props.priority]}`}>{PRIORITY_LABEL[props.priority]}</span>;
}
