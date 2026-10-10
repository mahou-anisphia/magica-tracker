import type { JSX } from 'preact';
import { loadSample, wipeSample } from '../actions';
import { setMode, type Mode } from '../store';
import type { ThemeChoice } from '../themes';
import { CalendarIcon, ListIcon, SparkIcon } from '../components/icons';
import { Backup } from './Backup';
import { ThemePicker } from './ThemePicker';

/**
 * The top bar: sample data and the theme on the left, the Overview/Timeline
 * switch in the middle, the backup controls on the right. Below 720px it
 * stacks: the view switch first, sample data and theme last.
 */
export function TopBar(props: {
  mode: Mode;
  now: Date;
  lastExportedAt: string | null;
  hasData: boolean;
  hasSample: boolean;
  theme: ThemeChoice;
}) {
  const option = (mode: Mode, label: string, icon: JSX.Element) => (
    <button
      type="button"
      class="inline-flex min-h-(--tap) cursor-pointer items-center gap-8 rounded-9 bg-transparent px-16 py-4 text-15 font-medium text-body aria-pressed:bg-card aria-pressed:text-ink aria-pressed:shadow-segment hover:aria-[pressed=false]:text-primary-ink"
      aria-pressed={props.mode === mode}
      onClick={() => setMode(mode)}
    >
      {icon}
      {label}
    </button>
  );
  return (
    <header class="grid grid-cols-[1fr_auto_1fr] items-center gap-x-16 gap-y-8 border-b border-line bg-card px-(--gutter) pt-[calc(8px+env(safe-area-inset-top,0px))] pb-8 max-md:grid-cols-1 max-md:justify-items-center">
      <div class="col-1 flex flex-wrap items-center gap-4 justify-self-start max-md:order-3 max-md:justify-center max-md:justify-self-center">
        {props.hasSample ? (
          <button type="button" class="btn btn-quiet btn-small" onClick={() => void wipeSample()}>
            <SparkIcon />
            Wipe sample data
          </button>
        ) : (
          <button type="button" class="btn btn-quiet btn-small" onClick={loadSample}>
            <SparkIcon />
            Load sample data
          </button>
        )}
        <ThemePicker choice={props.theme} />
      </div>
      <nav class="col-2 inline-flex gap-2 rounded-12 bg-chip-55 p-4 max-md:col-1" aria-label="View">
        {option('overview', 'Overview', <ListIcon />)}
        {option('timeline', 'Timeline', <CalendarIcon />)}
      </nav>
      <Backup now={props.now} lastExportedAt={props.lastExportedAt} hasData={props.hasData} />
    </header>
  );
}
