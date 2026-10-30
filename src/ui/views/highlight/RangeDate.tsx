import { useId, useRef } from 'preact/hooks';
import { calendarDay } from '../../../core/format';
import { DatePicker } from '../../components/DatePicker';
import { CalendarIcon } from '../../components/icons';

/** One end of the range: the day as a small button that opens the calendar. Clear does nothing; a range has both ends. */
export function RangeDate(props: { value: string; now: Date; noun: string; onChange: (day: string) => void }) {
  const trigger = useRef<HTMLButtonElement>(null);
  const popId = `range-${useId()}`;
  return (
    <>
      <button
        ref={trigger}
        type="button"
        class="btn btn-small tabular-nums"
        popovertarget={popId}
        aria-haspopup="dialog"
        aria-label={`The ${props.noun}: ${calendarDay(props.value)}. Change it`}
      >
        <CalendarIcon size={12} />
        {calendarDay(props.value)}
      </button>
      <DatePicker
        id={popId}
        anchor={trigger}
        value={props.value}
        now={props.now}
        of="the highlight"
        noun={props.noun}
        onChange={(day) => day && props.onChange(day)}
      />
    </>
  );
}
