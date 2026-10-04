import type { ProjectProgress } from '../../core/progress';
import type { Priority } from '../../core/schema';

export const PRIORITY_LABEL: Record<Priority, string> = { urgent: 'Urgent', high: 'High', medium: 'Medium', low: 'Low' };

export function PriorityChip(props: { priority: Priority | undefined }) {
  if (!props.priority) return null;
  return <span class={`pill prio-${props.priority}`}>{PRIORITY_LABEL[props.priority]}</span>;
}

/**
 * Effort progress: the darker fill is effort done, the lighter one effort
 * allocated to tasks but not done, the empty track what no task carries yet.
 * Over 100% allocated turns the label amber.
 */
export function EffortMeter(props: { progress: ProjectProgress; compact?: boolean }) {
  const { allocated, done, weighted } = props.progress;
  const over = allocated > 100;
  const label = weighted ? (over ? `${allocated}% allocated` : `of ${allocated}% allocated`) : 'by task count';
  return (
    <div class={`meter ${props.compact ? 'compact' : ''}`}>
      <div
        class="meter-track"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.min(done, 100)}
        aria-label={`${done}% done, ${weighted ? `${allocated}% of effort allocated` : 'measured by task count'}`}
      >
        {weighted && <span class="meter-allocated" style={{ width: `${Math.min(allocated, 100)}%` }} />}
        <span class="meter-done" style={{ width: `${Math.min(done, 100)}%` }} />
      </div>
      <span class="meter-value">{done}%</span>
      {!props.compact && <span class={`meter-note ${over ? 'over' : ''}`}>{label}</span>}
    </div>
  );
}
