import { useState } from 'preact/hooks';
import { dueByDate } from '../../../core/calendar';
import type { Root } from '../../../core/schema';
import { MonthCalendar } from '../../components/MonthCalendar';
import { set } from '../../store';
import { DayPanel } from './DayPanel';

/**
 * Your deadlines by month. Clicking a day (or anything on it) opens that day
 * in a side panel with all of them, with details and quick actions.
 */
export function TimelineView(props: { root: Root; now: Date; day: string | null }) {
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
          set({ day: date });
        }}
      />
      <DayPanel
        date={props.day}
        items={props.day ? (items.get(props.day) ?? []) : []}
        now={now}
        focusKey={focusKey}
        onClose={() => set({ day: null })}
      />
    </>
  );
}
