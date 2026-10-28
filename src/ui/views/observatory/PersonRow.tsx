import { useState } from 'preact/hooks';
import { monthName, shortDay } from '../../../core/format';
import { balanceLabel } from '../../../core/workdays';
import { FILE_STALE_DAYS } from '../../../core/team';
import { viewAs } from '../../actions';
import { Avatar } from '../../components/Avatar';
import { ChevronIcon } from '../../components/icons';
import { go } from '../../store';
import { LoadMeter } from './LoadMeter';
import { isPastLimit, pastLimitBefore, type Person } from './people';
import { PersonHistory } from './PersonHistory';

function note(p: Person): string {
  if (!p.member) return 'Live: your own data';
  const snap = p.member.snapshot;
  return snap ? `File from ${shortDay(snap.exportedAt)}` : 'No file yet';
}

/** One person this period: their load against their own limit, what to look at, and the periods before it on request. */
export function PersonRow(props: { person: Person; now: Date }) {
  const p = props.person;
  const d = p.data;
  const escalated = d?.escalations.length ?? 0;
  const before = pastLimitBefore(p);
  const [earlier, setEarlier] = useState(false);
  const historyId = `history-${p.key}`;
  const open = () => (p.member ? (d ? viewAs(p.member.id) : go('team', { key: 'team-import', hint: 'Import their file' })) : go('overview'));

  return (
    <li class="grid grid-cols-[36px_minmax(0,140px)_minmax(0,1fr)_auto] items-center gap-x-14 gap-y-10 border-t border-line px-22 py-14 first:border-t-0 max-lg:grid-cols-[36px_minmax(0,1fr)_auto] max-md:px-16">
      <Avatar name={p.name} />
      <span class="grid min-w-0 grid-cols-1">
        <span class="truncate font-medium text-ink">{p.name}</span>
        <span class="truncate text-12 text-body">{note(p)}</span>
      </span>
      <span class="grid min-w-0 grid-cols-1 gap-8 max-lg:col-span-full max-lg:row-start-2">
        {d ? <LoadMeter allocation={d.allocation} name={p.name} /> : <span class="text-13 text-faint">No data yet</span>}
        <span class="flex flex-wrap gap-6 empty:hidden">
          {d?.offToday && (
            <span class="pill bg-card bg-off text-ink inset-ring inset-ring-line">
              {d.offToday.kind === 'leave' ? 'On leave today' : `${d.offToday.title} today`}
            </span>
          )}
          {isPastLimit(p) && <span class="pill pill-watch">Past limit</span>}
          {before >= 2 && (
            <span class="pill pill-watch">
              Past it {before} of the last {d!.history.length}
            </span>
          )}
          {d && d.timesheet.length > 0 && (
            <span class="pill pill-watch">
              {d.timesheet.length === 1
                ? `${monthName(d.timesheet[0]!.month)} timesheet: ${balanceLabel(d.timesheet[0]!.diff, d.timesheet[0]!.month, props.now)}`
                : `Timesheet: ${d.timesheet.length} months off`}
            </span>
          )}
          {escalated > 0 && <span class="pill pill-high">May be escalated{escalated > 1 ? ` · ${escalated}` : ''}</span>}
          {d && d.stats.waiting > 0 && <span class="pill pill-outline">Waiting {d.stats.waiting}</span>}
          {d?.fileAge != null && d.fileAge > FILE_STALE_DAYS && <span class="pill pill-low">File {d.fileAge} days old</span>}
          {p.member && !d && <span class="pill pill-low">Ask for a file</span>}
        </span>
        {d && d.history.length > 0 && (
          <button
            type="button"
            class="group inline-flex min-h-(--tap) cursor-pointer items-center gap-6 justify-self-start text-13 font-medium text-primary-ink"
            aria-expanded={earlier}
            aria-controls={historyId}
            onClick={() => setEarlier(!earlier)}
          >
            Earlier {d.allocation.period}s
            <span class="inline-flex transition-transform group-aria-expanded:rotate-180">
              <ChevronIcon dir="down" />
            </span>
          </button>
        )}
      </span>
      <button
        type="button"
        class="btn btn-quiet btn-small text-primary-ink max-lg:col-start-3 max-lg:row-start-1"
        aria-label={`${!p.member ? 'Open your tracker' : d ? `View as ${p.name}` : `Import ${p.name}’s file`}`}
        onClick={open}
      >
        {!p.member ? 'Open' : d ? 'View' : 'Import'}
      </button>
      {earlier && d && <PersonHistory id={historyId} person={p} />}
    </li>
  );
}
