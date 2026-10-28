import { useState } from 'preact/hooks';
import { plural } from '../../../core/format';
import type { CalendarEntry } from '../../../core/schema';
import { workingDaysIn } from '../../../core/workdays';
import { deleteEntry } from '../../actions';
import { ENTRY_NOUN, entrySpan } from '../../components/dueItem';
import { ChevronIcon } from '../../components/icons';
import { useStore } from '../../store';
import { EntryForm } from './EntryForm';

/** Leave or a holiday covering the day, at the top of the day panel: opens to change or delete it. */
export function OffItem(props: { entry: CalendarEntry; now: Date }) {
  const { root } = useStore();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const e = props.entry;
  const days = workingDaysIn(root, e.date, e.until ?? e.date);
  const detailId = `day-off-${e.id}`;

  if (editing) {
    return (
      <li class="border-b border-line px-24 py-14">
        <EntryForm date={e.date} entry={e} now={props.now} onClose={() => setEditing(false)} />
      </li>
    );
  }

  return (
    <li class="border-b border-line bg-off">
      <button
        type="button"
        class="flex min-h-68 w-full cursor-pointer items-center gap-12 bg-transparent py-12 pr-18 pl-24 text-left hover:bg-page-70/60"
        aria-expanded={open}
        aria-controls={detailId}
        onClick={() => setOpen(!open)}
      >
        <span class="grid min-w-0 flex-1 grid-cols-1 gap-1">
          <span class="truncate font-medium text-ink" title={e.title}>
            {e.title}
          </span>
          <span class="truncate text-13 text-body">
            {ENTRY_NOUN[e.kind]} · {entrySpan(e)}
          </span>
        </span>
        <span class="pill bg-card text-ink inset-ring inset-ring-line">{days ? plural(days, 'working day') : 'No working days'}</span>
        <span class={`inline-flex text-body transition-transform ${open ? 'rotate-180' : ''}`}>
          <ChevronIcon dir="down" />
        </span>
      </button>
      {open && (
        <div id={detailId} class="grid grid-cols-1 gap-12 px-24 pb-18">
          {e.notes && <p class="rounded-10 bg-card px-14 py-10 text-14 whitespace-pre-wrap text-ink">{e.notes}</p>}
          <div class="flex flex-wrap gap-6">
            <button type="button" class="btn btn-small" onClick={() => setEditing(true)}>
              Change
            </button>
            <button type="button" class="btn btn-small btn-danger" onClick={() => deleteEntry(e)}>
              Delete
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
