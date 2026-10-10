import type { DueItem } from '../../../core/calendar';
import { plural } from '../../../core/format';
import { CrossIcon } from '../../components/icons';
import { Modal } from '../../components/Modal';
import { DayItem } from './DayItem';
import { itemKey, panelDay, parseDay } from './dueItem';

/** One day's deadlines in a panel from the right; each row opens to details and quick actions. */
export function DayPanel(props: { date: string | null; items: DueItem[]; now: Date; focusKey: string | null; onClose: () => void }) {
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
              <p class="text-13 text-body">{items.length ? plural(items.length, 'deadline') : 'No deadlines'}</p>
            </div>
            <button type="button" class="icon-btn" aria-label="Close" onClick={props.onClose}>
              <CrossIcon />
            </button>
          </header>
          <ul class="overflow-y-auto">
            {items.map((it) => (
              <DayItem key={itemKey(it)} item={it} now={now} startOpen={props.focusKey === itemKey(it)} />
            ))}
          </ul>
        </>
      )}
    </Modal>
  );
}
