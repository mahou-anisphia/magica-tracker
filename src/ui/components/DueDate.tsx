import { useRef } from 'preact/hooks';
import { dueLabel, isDueSoon } from '../../core/due';
import { CalendarIcon } from './icons';

/**
 * A deadline chip that opens the browser's own date picker. With no date it is
 * a quiet, always-visible calendar button, optionally with a text label.
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
  const input = useRef<HTMLInputElement>(null);
  const { value, done, now } = props;

  const open = () => {
    const el = input.current;
    if (!el) return;
    try {
      el.showPicker();
    } catch {
      el.focus();
      el.click();
    }
  };

  const watch = isDueSoon(value, done, now);
  return (
    <span class={`due ${value ? 'has-date' : 'empty'}`}>
      {value ? (
        <>
          <button
            type="button"
            class={`due-chip ${watch ? 'watch' : ''} ${done ? 'done' : ''}`}
            onClick={open}
            aria-label={`“${props.of}” deadline ${dueLabel(value, now)}. Change deadline`}
          >
            <CalendarIcon size={12} />
            {dueLabel(value, now)}
          </button>
          <button type="button" class="due-clear" onClick={() => props.onChange(undefined)} aria-label="Clear deadline">
            ×
          </button>
        </>
      ) : (
        <button
          type="button"
          class={props.emptyLabel ? 'btn small due-add' : 'icon-btn due-add'}
          onClick={open}
          aria-label={`Set a deadline for “${props.of}”`}
          title="Set deadline"
        >
          <CalendarIcon />
          {props.emptyLabel}
        </button>
      )}
      <input
        ref={input}
        type="date"
        class="due-input"
        tabIndex={-1}
        aria-hidden="true"
        value={value ?? ''}
        onChange={(e) => props.onChange(e.currentTarget.value || undefined)}
      />
    </span>
  );
}
