import { useId, useRef } from 'preact/hooks';
import { dueLabel, isDueSoon } from '../../core/due';
import { DatePicker } from './DatePicker';
import { CalendarIcon } from './icons';

/**
 * A deadline chip that opens a small calendar. With no date it is a quiet,
 * always-visible calendar button, optionally with a text label. It stays one
 * button either way, so focus survives setting the first date.
 */
export function DueDate(props: {
  value: string | undefined;
  done: boolean;
  now: Date;
  /** What it belongs to, for screen readers: the project, task or sub-task. */
  of: string;
  onChange: (due: string | undefined) => void;
  /** Shown beside the icon when no date is set, e.g. "Deadline". */
  emptyLabel?: string;
}) {
  const trigger = useRef<HTMLButtonElement>(null);
  const popId = `due-${useId()}`;
  const { value, done, now } = props;

  const watch = isDueSoon(value, done, now);
  const cls = value
    ? `due-chip ${watch ? 'watch' : ''} ${done ? 'done' : ''}`
    : props.emptyLabel
      ? 'btn small due-add'
      : 'icon-btn due-add';
  return (
    <span class={`due ${value ? 'has-date' : 'empty'}`}>
      <button
        ref={trigger}
        type="button"
        class={cls}
        popovertarget={popId}
        aria-haspopup="dialog"
        aria-label={
          value ? `“${props.of}” deadline ${dueLabel(value, now)}. Change deadline` : `Set a deadline for “${props.of}”`
        }
        title={value ? undefined : 'Set deadline'}
      >
        <CalendarIcon size={value ? 12 : undefined} />
        {value ? dueLabel(value, now) : props.emptyLabel}
      </button>
      {value && (
        <button type="button" class="due-clear" onClick={() => props.onChange(undefined)} aria-label="Clear deadline">
          ×
        </button>
      )}
      <DatePicker id={popId} anchor={trigger} value={value} now={now} of={props.of} onChange={props.onChange} />
    </span>
  );
}
