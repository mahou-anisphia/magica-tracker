import { useId, useState } from 'preact/hooks';
import { plural } from '../../../core/format';
import type { EntryInput } from '../../../core/ops';
import type { CalendarEntry, EntryKind } from '../../../core/schema';
import { isTracking, workingDaysIn } from '../../../core/workdays';
import { addEntry, saveEntry } from '../../actions';
import { DueDate } from '../../components/DueDate';
import { EffortInput } from '../../components/EffortInput';
import { ENTRY_NOUN } from '../../components/dueItem';
import { Segmented } from '../../components/Segmented';
import { useStore } from '../../store';

const KINDS: { value: EntryKind; label: string }[] = [
  { value: 'event', label: 'Event' },
  { value: 'leave', label: 'Leave' },
  { value: 'holiday', label: 'Holiday' },
];

const PLACEHOLDER: Record<EntryKind, string> = { event: 'What’s happening?', leave: 'Leave', holiday: 'Name of the holiday' };

const LABEL = 'pt-6 text-13 font-medium text-body max-sm:pt-0';
const FIELD = 'min-h-34 w-full rounded-8 border border-line bg-card px-10 py-4 text-14 text-ink max-lg:min-h-44 max-lg:text-16';

/**
 * Adds an event, leave or a holiday on a day, or (with `entry`) changes one.
 * An event takes a time, an allocation and notes; leave and holidays say how
 * many working days they take, since those count toward the month's
 * timesheet and lower the period's capacity. Leave and holidays without a
 * title are called just that.
 */
export function EntryForm(props: { date: string; entry?: CalendarEntry; now: Date; onClose: () => void }) {
  const { root } = useStore();
  const e = props.entry;
  const [kind, setKind] = useState<EntryKind>(e?.kind ?? 'event');
  const [title, setTitle] = useState(e?.title ?? '');
  const [date, setDate] = useState(e?.date ?? props.date);
  const [until, setUntil] = useState(e?.until);
  const [time, setTime] = useState(e?.time ?? '');
  const [effort, setEffort] = useState(e?.effort);
  const [notes, setNotes] = useState(e?.notes ?? '');
  const id = useId();
  const event = kind === 'event';
  const name = title.trim() || (event ? '' : ENTRY_NOUN[kind]);
  const days = workingDaysIn(root, date, until && until > date ? until : date);

  const submit = (ev: Event) => {
    ev.preventDefault();
    if (!name) return;
    const input: EntryInput = {
      kind,
      title: name,
      date,
      ...(until && until > date ? { until } : {}),
      ...(event ? { time, effort } : {}),
      notes,
    };
    if (e) saveEntry(e.id, input);
    else addEntry(input);
    props.onClose();
  };

  return (
    <form
      class="grid grid-cols-1 gap-14 rounded-14 border border-accent-line p-16"
      aria-labelledby={`${id}-h`}
      onSubmit={submit}
      onKeyDown={(ev) => {
        // Escape closes the form, not the panel; inside a date picker it closes the picker.
        if (ev.key !== 'Escape' || (ev.target as HTMLElement).closest('[popover]')) return;
        ev.preventDefault();
        ev.stopPropagation();
        props.onClose();
      }}
    >
      <div class="flex flex-wrap items-center justify-between gap-12">
        <h3 id={`${id}-h`} class="text-15">
          {e ? `Change ${ENTRY_NOUN[kind].toLowerCase()}` : 'Add to this day'}
        </h3>
        <Segmented label="Kind" value={kind} options={KINDS} onChange={setKind} />
      </div>

      <div class="grid grid-cols-[92px_minmax(0,1fr)] items-start gap-x-12 gap-y-10 max-sm:grid-cols-1 max-sm:gap-y-4">
        <label for={`${id}-title`} class={LABEL}>
          Title
        </label>
        <input
          id={`${id}-title`}
          class={FIELD}
          value={title}
          placeholder={PLACEHOLDER[kind]}
          autoFocus
          onInput={(ev) => setTitle(ev.currentTarget.value)}
        />

        <span class={LABEL}>Date</span>
        <div class="flex flex-wrap items-center gap-8">
          <DueDate value={date} done={false} plain now={props.now} of={name || 'the entry'} noun="date" onChange={(d) => d && setDate(d)} />
          <span class="text-13 text-body">until</span>
          <DueDate
            value={until}
            done={false}
            plain
            now={props.now}
            of={name || 'the entry'}
            noun="last day"
            emptyLabel="Same day"
            onChange={setUntil}
          />
        </div>

        {event && (
          <>
            <label for={`${id}-time`} class={LABEL}>
              Time
            </label>
            <input id={`${id}-time`} type="time" class={`${FIELD} w-140`} value={time} onInput={(ev) => setTime(ev.currentTarget.value)} />
            <label for={`${id}-effort`} class={LABEL}>
              Allocation
            </label>
            <EffortInput bare id={`${id}-effort`} value={effort} onChange={setEffort} />
          </>
        )}

        <label for={`${id}-notes`} class={LABEL}>
          Notes
        </label>
        <textarea id={`${id}-notes`} class={FIELD} rows={2} placeholder="Optional" value={notes} onInput={(ev) => setNotes(ev.currentTarget.value)} />
      </div>

      <p class="flex items-start gap-10 rounded-10 bg-page px-12 py-10 text-13 text-ink">
        {event ? (
          'An event is a task with no project: tick it done, give it an allocation if it takes time, or move it into a project later. It never touches the timesheet.'
        ) : (
          <>
            <span class="pill bg-card bg-off text-ink inset-ring inset-ring-line">{plural(days, 'working day')}</span>
            {isTracking(root) ? 'Counts toward the month’s timesheet and lowers your capacity for the period.' : 'Lowers your capacity for the period.'}
          </>
        )}
      </p>

      <div class="flex justify-end gap-6">
        <button type="button" class="btn btn-quiet btn-small" onClick={props.onClose}>
          Cancel
        </button>
        <button type="submit" class="btn btn-primary btn-small" disabled={!name}>
          {e ? 'Save' : `Add ${ENTRY_NOUN[kind].toLowerCase()}`}
        </button>
      </div>
    </form>
  );
}
