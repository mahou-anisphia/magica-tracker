import { useState } from 'preact/hooks';
import { calendarDay, monthName } from '../../../core/format';
import { chargesIn } from '../../../core/costCenters';
import { workdaySettings, type Root } from '../../../core/schema';
import { localDateStamp } from '../../../core/time';
import { balanceLabel, monthBalance, monthOf, shiftMonth, timesheetFlags } from '../../../core/workdays';
import { GlanceNumbers } from '../../components/GlanceNumbers';
import { ChevronIcon } from '../../components/icons';
import { Panel } from '../../components/Panel';
import { ViewHeader } from '../../components/ViewHeader';
import { go } from '../../store';
import { CostCenters } from './CostCenters';
import { DaysOff } from './DaysOff';
import { EarlierMonths } from './EarlierMonths';
import { MonthBar } from './MonthBar';
import { MonthBreakdown } from './MonthBreakdown';
import { ProjectDays } from './ProjectDays';

/**
 * The finance timesheet, a month at a time: its working days, given to
 * projects in whole days, with leave and holidays counting toward them. The
 * month adds up when every working day is accounted for; which day went
 * where doesn't matter. Months before this one are listed, flagged when they
 * don't add up. Cost centers, what the days are charged to, are kept here
 * too. Without a start date (Settings) there is nothing to keep yet, but the
 * cost centers can be set up already.
 */
export function TimeLogView(props: { root: Root; now: Date; month: string | null }) {
  const { root, now } = props;
  const today = localDateStamp(now);
  const current = monthOf(today);
  const [month, setMonth] = useState(props.month ?? current);
  const [opened, setOpened] = useState(false);
  const { from } = workdaySettings(root);

  if (!from) {
    return (
      <>
        <ViewHeader title="Time log">Each month’s working days, given to projects in whole days.</ViewHeader>
        <Panel id="timelog-start-h" title="Start the timesheet" highlight="timelog-projects" note="Pick the day it counts from, and your working weekdays.">
          <button
            type="button"
            class="btn btn-primary justify-self-start"
            onClick={() => go('settings', { key: 'settings-workdays', hint: 'Set Tracking from' })}
          >
            Set the start date
          </button>
        </Panel>
        <div class="mt-24 max-w-560">
          <CostCenters root={root} month={current} daysOff={0} />
        </div>
      </>
    );
  }

  const b = monthBalance(root, month);
  const flagged = timesheetFlags(root, now).some((f) => f.month === month);
  const status = balanceLabel(b.diff, month, now);
  // Opens to where the days are charged, once there are cost centers and days to show.
  const charges = chargesIn(root, month);
  const canOpen = !!root.costCenters?.length && b.filled > 0;
  const open = opened && canOpen;
  const summary = (
    <span>
      <strong class="font-medium text-ink tabular-nums">
        {b.filled} of {b.target}
      </strong>{' '}
      · projects {b.given} + days off {b.leave + b.holiday}
    </span>
  );
  const previous = shiftMonth(month, -1);
  const earlier: string[] = [];
  for (let m = shiftMonth(current, -1); m >= monthOf(from); m = shiftMonth(m, -1)) earlier.push(m);

  return (
    <>
      <ViewHeader title="Time log">Each month’s working days, given to projects in whole days. Leave and holidays count toward them.</ViewHeader>

      <div class="mb-14 flex flex-wrap items-center gap-12">
        <div class="flex items-center gap-4">
          <button type="button" class="icon-btn min-h-(--tap) min-w-(--tap)" aria-label="Previous month" onClick={() => setMonth(previous)}>
            <ChevronIcon dir="left" />
          </button>
          <h2 class="min-w-170 text-center text-22 tracking-[-0.01em]" aria-live="polite">
            {monthName(month, true)}
          </h2>
          <button type="button" class="icon-btn min-h-(--tap) min-w-(--tap)" aria-label="Next month" onClick={() => setMonth(shiftMonth(month, 1))}>
            <ChevronIcon dir="right" />
          </button>
          <button type="button" class="btn btn-quiet btn-small" disabled={month === current} onClick={() => setMonth(current)}>
            This month
          </button>
        </div>
        <span class={`pill ml-auto ${flagged ? 'pill-watch' : 'pill-plain'}`}>{b.target ? status : 'No working days'}</span>
      </div>

      <div class="mb-24 overflow-hidden rounded-14 border border-line bg-card shadow-card">
        <GlanceNumbers
          items={[
            { label: 'Working days', value: b.target, tone: 'plain' },
            { label: 'Given to projects', value: b.given, tone: 'plain' },
            { label: 'Leave and holidays', value: b.leave + b.holiday, tone: 'plain' },
            { label: b.diff > 0 ? 'Over' : 'To go', value: Math.abs(b.diff), tone: 'gold' },
          ]}
        />
        <div class="grid grid-cols-1 gap-8 border-t border-line bg-page-40 px-26 pt-16 pb-18 max-md:px-18">
          <MonthBar balance={b} charges={open ? charges : undefined} />
          <div class="flex flex-wrap justify-between gap-x-16 gap-y-4 text-13 text-body">
            {canOpen ? (
              <button
                type="button"
                class="group -mx-8 -my-4 inline-flex cursor-pointer items-center gap-6 rounded-8 px-8 py-4 text-left hover:bg-page-70 hover:text-primary-ink"
                aria-expanded={open}
                aria-controls="month-breakdown"
                onClick={() => setOpened(!opened)}
              >
                {summary}
                <span class="inline-flex transition-transform group-aria-expanded:rotate-180" aria-hidden="true">
                  <ChevronIcon dir="down" />
                </span>
                <span class="sr-only">{open ? ', hide where they’re charged' : ', show where they’re charged'}</span>
              </button>
            ) : (
              <span>{summary}</span>
            )}
            {b.lastDay && <span>{calendarDay(b.lastDay)} is the month’s last working day</span>}
          </div>
          {open && <MonthBreakdown id="month-breakdown" balance={b} charges={charges} now={now} />}
        </div>
      </div>

      <div class="grid grid-cols-[minmax(0,1fr)_340px] items-start gap-24 max-lg:grid-cols-1">
        <ProjectDays root={root} balance={b} current={current} previous={{ month: previous, name: monthName(previous) }} />
        <div class="grid grid-cols-1 gap-24">
          <CostCenters root={root} month={month} daysOff={b.leave + b.holiday} />
          <DaysOff balance={b} addOn={month === current ? today : `${month}-01`} />
          <EarlierMonths root={root} months={earlier} shown={month} since={calendarDay(from)} onPick={setMonth} />
        </div>
      </div>
    </>
  );
}
