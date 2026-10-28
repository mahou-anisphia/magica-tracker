import { useState } from 'preact/hooks';
import { dueByDate } from '../../../core/calendar';
import type { Root } from '../../../core/schema';
import { daysOffOn } from '../../../core/workdays';
import { startAddingEntry } from '../../actions';
import { MonthCalendar } from '../../components/MonthCalendar';
import { set } from '../../store';
import { DayPanel } from './DayPanel';

/**
 * Your deadlines, events, leave and holidays by month. Clicking a day (or
 * anything on it) opens that day in a side panel with all of them, with
 * details and quick actions; + Add opens today's with its form showing.
 */
export function TimelineView(props: { root: Root; now: Date; day: string | null; adding: boolean }) {
  const { root, now } = props;
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const items = dueByDate(root, now);
  return (
    <>
      <MonthCalendar
        root={root}
        now={now}
        day={props.day}
        onOpenDay={(date, key) => {
          setFocusKey(key);
          set({ day: date, adding: false });
        }}
        onAdd={() => {
          setFocusKey(null);
          startAddingEntry();
        }}
      />
      <DayPanel
        date={props.day}
        items={props.day ? (items.get(props.day) ?? []) : []}
        off={props.day ? daysOffOn(root, props.day) : []}
        now={now}
        focusKey={focusKey}
        adding={props.adding}
        onClose={() => set({ day: null, adding: false })}
      />
    </>
  );
}
