import { lastWeek, rangeLabel, shiftRange, type DateRange } from '../../../core/highlight';
import { localDateStamp } from '../../../core/time';
import { copyHighlight } from '../../actions';
import { HintTag, useHighlight } from '../../components/highlight';
import { ChevronIcon, CopyIcon } from '../../components/icons';
import { RangeDate } from './RangeDate';

/**
 * Which days the highlight covers, a week at a time or any two days, and Copy
 * beside them, so the usual export is: open the screen, Copy.
 */
export function RangeStrip(props: { range: DateRange; now: Date; text: string; onChange: (range: DateRange) => void }) {
  const { range, now } = props;
  const last = lastWeek(now);
  const isLast = range.from === last.from && range.to === last.to;
  const next = shiftRange(range, 1);
  const copy = useHighlight('highlight-copy');
  // Two days in either order make a range.
  const setDay = (day: string, end: 'from' | 'to') => {
    const other = end === 'from' ? range.to : range.from;
    props.onChange(day <= other ? { from: day, to: other } : { from: other, to: day });
  };

  return (
    <div class="mb-24 flex flex-wrap items-center gap-x-16 gap-y-10">
      <div class="flex items-center gap-4">
        <button type="button" class="icon-btn min-h-(--tap) min-w-(--tap)" aria-label="A week earlier" onClick={() => props.onChange(shiftRange(range, -1))}>
          <ChevronIcon dir="left" />
        </button>
        <h2 class="min-w-200 text-center text-22 tracking-[-0.01em] max-md:min-w-0" aria-live="polite">
          {rangeLabel(range)}
        </h2>
        <button
          type="button"
          class="icon-btn min-h-(--tap) min-w-(--tap) disabled:cursor-default disabled:opacity-40"
          aria-label="A week later"
          disabled={next.from > localDateStamp(now)}
          onClick={() => props.onChange(next)}
        >
          <ChevronIcon dir="right" />
        </button>
        <button type="button" class="btn btn-quiet btn-small" disabled={isLast} onClick={() => props.onChange(last)}>
          Last week
        </button>
      </div>
      <div class="flex items-center gap-6 text-13 text-body">
        <RangeDate value={range.from} now={now} noun="first day" onChange={(d) => setDay(d, 'from')} />
        to
        <RangeDate value={range.to} now={now} noun="last day" onChange={(d) => setDay(d, 'to')} />
      </div>
      <span {...copy.attrs} class={`relative ml-auto rounded-10 ${copy.ring}`}>
        <HintTag text={copy.hint} />
        <button type="button" class="btn btn-primary" onClick={() => void copyHighlight(props.text)}>
          <CopyIcon />
          Copy
        </button>
      </span>
    </div>
  );
}
