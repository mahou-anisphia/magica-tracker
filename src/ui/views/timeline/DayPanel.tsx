import type { DueItem } from '../../../core/calendar';
import type { CalendarEntry } from '../../../core/schema';
import { CrossIcon, PlusIcon } from '../../components/icons';
import { Modal } from '../../components/Modal';
import { set } from '../../store';
import { DayItem } from './DayItem';
import { EntryForm } from './EntryForm';
import { EventItem } from './EventItem';
import { OffItem } from './OffItem';
import { dayCount, itemKey, panelDay, parseDay } from '../../components/dueItem';

/**
 * One day in a panel from the right: its leave or holiday first, then its
 * deadlines and events, each opening to details and quick actions, and a way
 * to add an event, leave or a holiday on the day.
 */
export function DayPanel(props: {
  date: string | null;
  items: DueItem[];
  off: CalendarEntry[];
  now: Date;
  focusKey: string | null;
  adding: boolean;
  onClose: () => void;
}) {
  const { date, items, now } = props;
  return (
    <Modal open={!!date} onClose={props.onClose} labelledBy="day-h" variant="drawer">
      {date && (
        <>
          <header class="flex items-start justify-between gap-12 border-b border-line pt-[calc(18px+env(safe-area-inset-top,0px))] pr-18 pb-16 pl-24">
            <div>
              <h2 id="day-h" class="text-17">
                {panelDay.format(parseDay(date))}
              </h2>
              <p class="text-13 text-body">
                {dayCount(items, props.off)}
              </p>
            </div>
            <button type="button" class="icon-btn" aria-label="Close" onClick={props.onClose}>
              <CrossIcon />
            </button>
          </header>
          <div class="overflow-y-auto">
            <ul>
              {props.off.map((e) => (
                <OffItem key={e.id} entry={e} now={now} />
              ))}
              {items.map((it) =>
                it.kind === 'event' ? (
                  <EventItem key={itemKey(it)} item={it} now={now} startOpen={props.focusKey === itemKey(it)} />
                ) : (
                  <DayItem key={itemKey(it)} item={it} now={now} startOpen={props.focusKey === itemKey(it)} />
                ),
              )}
            </ul>
            <div class="px-24 pt-16 pb-24">
              {props.adding ? (
                <EntryForm key={date} date={date} now={now} onClose={() => set({ adding: false })} />
              ) : (
                <button
                  type="button"
                  class="flex min-h-44 w-full cursor-pointer items-center gap-8 rounded-10 border border-dashed border-line-strong bg-transparent px-12 text-14 text-body hover:border-accent hover:text-primary-ink"
                  onClick={() => set({ adding: true })}
                >
                  <PlusIcon size={14} />
                  Add an event, leave or a holiday
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </Modal>
  );
}
