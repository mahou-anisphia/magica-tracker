import { workdaySettings, type Root } from '../../../core/schema';
import { HOURS_PER_WEEK } from '../../../core/units';
import { setTrackingFrom, setWeekdays } from '../../actions';
import { DueDate } from '../../components/DueDate';
import { Panel } from '../../components/Panel';

// 2024-01-01 was a Monday.
const weekday = new Intl.DateTimeFormat(undefined, { weekday: 'short' });
const DAYS = Array.from({ length: 7 }, (_, i) => ({ n: i + 1, label: weekday.format(new Date(2024, 0, 1 + i)) }));

/**
 * The timesheet: the day it starts from (none: no timesheet is kept, the
 * Time log waits for one and nothing is flagged) and the weekdays worked, which also
 * decide which days off lower a period's capacity. Saved with your data.
 */
export function WorkdaysCard(props: { root: Root; now: Date }) {
  const { from, weekdays } = workdaySettings(props.root);
  const toggle = (n: number) => setWeekdays(weekdays.includes(n) ? weekdays.filter((d) => d !== n) : [...weekdays, n], weekdays);
  const hours = weekdays.length ? Math.round((HOURS_PER_WEEK / weekdays.length) * 10) / 10 : 0;
  return (
    <Panel
      id="workdays-h"
      title="Working days"
      highlight="settings-workdays"
      note="Every calendar month’s working days are given to projects on the Time log. Leave and holidays count toward them."
    >
      <div class="flex flex-wrap items-center justify-between gap-12">
        <span class="font-medium text-ink">Tracking from</span>
        <DueDate
          value={from}
          done={false}
          plain
          now={props.now}
          of="the timesheet"
          noun="start date"
          emptyLabel="Set a date"
          onChange={setTrackingFrom}
        />
      </div>
      <div class="flex flex-wrap items-center justify-between gap-12">
        <span class="font-medium text-ink">Working weekdays</span>
        <div role="group" aria-label="Working weekdays" class="flex flex-wrap gap-4">
          {DAYS.map((d) => (
            <button
              key={d.n}
              type="button"
              class="min-h-30 min-w-44 cursor-pointer rounded-8 border border-line bg-card px-8 text-13 font-medium text-body hover:border-accent hover:text-primary-ink aria-pressed:border-primary-pressed aria-pressed:bg-primary-tint aria-pressed:text-primary-ink max-lg:min-h-44"
              aria-pressed={weekdays.includes(d.n)}
              onClick={() => toggle(d.n)}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>
      <div class="flex flex-wrap items-center justify-between gap-12">
        <span class="font-medium text-ink">A day is</span>
        <span class="text-14 text-ink tabular-nums">
          {weekdays.length ? `${hours} hours (${HOURS_PER_WEEK} a week ÷ ${weekdays.length})` : 'No working days'}
        </span>
      </div>
      <p class="text-12 text-body">
        {from
          ? 'A day off on a working weekday counts as one of the month’s days. Weekends don’t count.'
          : 'Until a date is set no timesheet is kept: the Time log waits for it and no month is flagged. Nothing else changes.'}
      </p>
    </Panel>
  );
}
