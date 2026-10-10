import { useId, useRef } from 'preact/hooks';
import { dueLabel, isDueSoon } from '../../../core/due';
import { CalendarIcon } from '../../components/icons';
import { DatePicker } from './DatePicker';

const CHIP =
  "inline-flex min-h-26 cursor-pointer items-center gap-5 rounded-full px-10 text-12 font-medium whitespace-nowrap tabular-nums max-lg:relative max-lg:after:absolute max-lg:after:-inset-x-4 max-lg:after:-inset-y-10 max-lg:after:content-['']";

/*
 * Clearing a deadline: a small badge on the chip's corner, shown on hover or
 * focus. It takes no space in the row, so nothing shifts when it appears.
 * Touch screens don't get it: the picker has its own Clear.
 */
const CLEAR =
  'pointer-events-none absolute -top-7 -right-7 grid size-18 cursor-pointer place-items-center rounded-full border border-line bg-card p-0 text-12 leading-none text-body opacity-0 transition-opacity duration-120 group-focus-within/due:pointer-events-auto group-focus-within/due:opacity-100 group-hover/due:pointer-events-auto group-hover/due:opacity-100 hover:border-accent hover:text-primary-ink [@media(hover:none)]:hidden';

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
  // Set: a chip, amber when approaching. Empty: a quiet button that brightens
  // while its row (a parent with group/row) is hovered.
  const cls = value
    ? `${CHIP} ${done ? 'bg-transparent text-faint' : watch ? 'bg-watch-tint text-watch-ink inset-ring inset-ring-watch/45' : 'bg-chip text-body'}`
    : props.emptyLabel
      ? 'btn btn-small focus-visible:text-body'
      : 'icon-btn text-faint group-hover/row:text-body focus-visible:text-body';
  return (
    <span class="group/due relative inline-flex flex-none items-center">
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
        <button type="button" class={CLEAR} onClick={() => props.onChange(undefined)} aria-label="Clear deadline">
          ×
        </button>
      )}
      <DatePicker id={popId} anchor={trigger} value={value} now={now} of={props.of} onChange={props.onChange} />
    </span>
  );
}
