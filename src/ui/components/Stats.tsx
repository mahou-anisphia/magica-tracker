import { stats } from '../../core/progress';
import type { Root } from '../../core/schema';

/** Four numbers under the date. Archived and done projects don't count. */
export function StatsRow(props: { root: Root; now: Date }) {
  const s = stats(props.root, props.now);
  return (
    <div class="stats">
      <Stat label="Open tasks" value={s.open} tone="plain" />
      <Stat label="In progress" value={s.inProgress} tone="frost" />
      <Stat label="Due this week" value={s.dueThisWeek} tone="iris" />
      <Stat label="Overdue" value={s.overdue} tone="gold" />
    </div>
  );
}

function Stat(props: { label: string; value: number; tone: 'plain' | 'frost' | 'iris' | 'gold' }) {
  return (
    <div class={`stat ${props.tone}`}>
      <span class="stat-label">{props.label}</span>
      <span class="stat-value">{props.value}</span>
    </div>
  );
}
