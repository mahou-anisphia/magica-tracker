import { shortDay } from '../../../core/format';
import { FILE_STALE_DAYS } from '../../../core/team';
import { viewAs } from '../../actions';
import { Avatar } from '../../components/Avatar';
import { go } from '../../store';
import { LoadMeter } from './LoadMeter';
import { isPastLimit, type Person } from './people';

function note(p: Person): string {
  if (!p.member) return 'Live: your own data';
  const snap = p.member.snapshot;
  return snap ? `File from ${shortDay(snap.exportedAt)}` : 'No file yet';
}

/** One person this period: their load against their own limit, and what to look at. */
export function PersonRow(props: { person: Person }) {
  const p = props.person;
  const d = p.data;
  const escalated = d?.escalations.length ?? 0;
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
          {isPastLimit(p) && <span class="pill pill-watch">Past limit</span>}
          {escalated > 0 && <span class="pill pill-high">May be escalated{escalated > 1 ? ` · ${escalated}` : ''}</span>}
          {d && d.stats.blocked > 0 && <span class="pill pill-outline">Blocked {d.stats.blocked}</span>}
          {d?.fileAge != null && d.fileAge > FILE_STALE_DAYS && <span class="pill pill-low">File {d.fileAge} days old</span>}
          {p.member && !d && <span class="pill pill-low">Ask for a file</span>}
        </span>
      </span>
      <button
        type="button"
        class="btn btn-quiet btn-small text-primary-ink max-lg:col-start-3 max-lg:row-start-1"
        aria-label={`${!p.member ? 'Open your tracker' : d ? `View as ${p.name}` : `Import ${p.name}’s file`}`}
        onClick={open}
      >
        {!p.member ? 'Open' : d ? 'View' : 'Import'}
      </button>
    </li>
  );
}
