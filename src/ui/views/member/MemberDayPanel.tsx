import type { DueItem } from '../../../core/calendar';
import { plural } from '../../../core/format';
import type { AllocationPeriod } from '../../../core/schema';
import { itemKey, panelDay, parseDay } from '../../components/dueItem';
import { CrossIcon } from '../../components/icons';
import { Modal } from '../../components/Modal';
import { MemberDayItem } from './MemberDayItem';

/** One day of their deadlines, from the right, read-only. */
export function MemberDayPanel(props: {
  date: string | null;
  items: DueItem[];
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
                {props.name}: {items.length ? plural(items.length, 'deadline') : 'no deadlines'} · read-only
              </p>
            </div>
            <button type="button" class="icon-btn" aria-label="Close" onClick={props.onClose}>
              <CrossIcon />
            </button>
          </header>
          <ul class="overflow-y-auto">
            {items.map((it) => (
              <MemberDayItem key={itemKey(it)} item={it} now={props.now} period={props.period} />
            ))}
          </ul>
        </>
      )}
    </Modal>
  );
}
