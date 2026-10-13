import type { Status } from '../../core/schema';

export const STATUS_LABEL: Record<Status, string> = { todo: 'To do', working: 'Working', waiting: 'Waiting', done: 'Done' };

/**
 * A task's status where it matters on a row: Working (a quiet pill with a
 * dot) or Waiting (an ink outline, which hides the other chips). To do and
 * Done say nothing; the checkbox already does.
 */
export function StatusChip(props: { status: Status }) {
  if (props.status === 'waiting') return <span class="pill pill-outline">Waiting</span>;
  if (props.status === 'working') {
    return (
      <span class="pill pill-low">
        <span class="size-6 rounded-full bg-primary-strong" aria-hidden="true" />
        Working
      </span>
    );
  }
  return null;
}
