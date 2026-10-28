import type { DueItem } from '../../../core/calendar';
import type { AllocationPeriod, CalendarEntry } from '../../../core/schema';
import { dayCount, ENTRY_NOUN, entrySpan, itemKey, panelDay, parseDay } from '../../components/dueItem';
import { CrossIcon } from '../../components/icons';
import { Modal } from '../../components/Modal';
import { MemberDayItem } from './MemberDayItem';

/** One day of their deadlines, events, leave and holidays, from the right, read-only. */
export function MemberDayPanel(props: {
  date: string | null;
  items: DueItem[];
  /** Their leave and holidays on the day. */
  off: CalendarEntry[];
  name: string;
  now: Date;
  /** Their allocation period, which their tasks' allocations are shares of. */
  period: AllocationPeriod;
  onClose: () => void;
}) {
  const { date, items } = props;
  return (
    <Modal open={!!date} onClose={props.onClose} labelledBy="member-day-h" variant="drawer">
      {date && (
        <>
          <header class="flex items-start justify-between gap-12 border-b border-line pt-[calc(18px+env(safe-area-inset-top,0px))] pr-18 pb-16 pl-24">
            <div>
              <h2 id="member-day-h" class="text-17">
                {panelDay.format(parseDay(date))}
              </h2>
              <p class="text-13 text-body">
                {props.name}: {dayCount(items, props.off)} · read-only
              </p>
            </div>
            <button type="button" class="icon-btn" aria-label="Close" onClick={props.onClose}>
              <CrossIcon />
            </button>
          </header>
          <ul class="overflow-y-auto">
            {props.off.map((e) => (
              <li key={e.id} class="grid grid-cols-1 gap-1 border-b border-line bg-off py-14 pr-18 pl-24">
                <span class="truncate font-medium text-ink">{e.title}</span>
                <span class="truncate text-13 text-body">
                  {ENTRY_NOUN[e.kind]} · {entrySpan(e)}
                </span>
              </li>
            ))}
            {items.map((it) => (
              <MemberDayItem key={itemKey(it)} item={it} now={props.now} period={props.period} />
            ))}
          </ul>
        </>
      )}
    </Modal>
  );
}
