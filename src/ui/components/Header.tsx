import type { JSX } from 'preact';
import { useRef } from 'preact/hooks';
import { isExportStale } from '../../core/attention';
import { relativeDays } from '../../core/format';
import { localDateStamp } from '../../core/time';
import { exportNow, loadSample, startImport, wipeSample } from '../actions';
import { setMode, type Mode } from '../store';
import { CalendarIcon, ListIcon, SparkIcon } from './icons';

const dateFormat = new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long' });

/**
 * The top bar: sample data on the left, the Overview/Timeline switch in the
 * middle, the backup controls on the right.
 */
export function TopBar(props: {
  mode: Mode;
  now: Date;
  lastExportedAt: string | null;
  hasData: boolean;
  hasSample: boolean;
}) {
  const option = (mode: Mode, label: string, icon: JSX.Element) => (
    <button type="button" aria-pressed={props.mode === mode} onClick={() => setMode(mode)}>
      {icon}
      {label}
    </button>
  );
  return (
    <header class="topbar">
      <div class="sample">
        {props.hasSample ? (
          <button type="button" class="btn quiet small" onClick={() => void wipeSample()}>
            <SparkIcon />
            Wipe sample data
          </button>
        ) : (
          <button type="button" class="btn quiet small" onClick={loadSample}>
            <SparkIcon />
            Load sample data
          </button>
        )}
      </div>
      <nav class="segmented" aria-label="View">
        {option('overview', 'Overview', <ListIcon />)}
        {option('timeline', 'Timeline', <CalendarIcon />)}
      </nav>
      <Backup now={props.now} lastExportedAt={props.lastExportedAt} hasData={props.hasData} />
    </header>
  );
}

/** Overview's heading: today's date. */
export function TodayHeading(props: { now: Date }) {
  return (
    <h1 class="today">
      <time dateTime={localDateStamp(props.now)}>{dateFormat.format(props.now)}</time>
    </h1>
  );
}

function Backup(props: { now: Date; lastExportedAt: string | null; hasData: boolean }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const { now, lastExportedAt, hasData } = props;
  // Export is the only backup, so an old or missing export is worth watching.
  const watch = hasData && isExportStale(lastExportedAt, now);

  let exported = '';
  if (lastExportedAt) exported = `Last exported ${relativeDays(lastExportedAt, now)}`;
  else if (hasData) exported = 'Not exported yet';

  return (
    <div class="backup">
      {watch ? (
        <span class="watch-pill" title="Export is the only backup of this data">
          {exported}
        </span>
      ) : (
        exported && <span class="last-export">{exported}</span>
      )}
      <button type="button" class="btn small" onClick={exportNow}>
        Export
      </button>
      <button type="button" class="btn small" onClick={() => fileRef.current?.click()}>
        Import
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => {
          const input = e.currentTarget;
          const file = input.files?.[0];
          input.value = ''; // picking the same file again should still fire
          if (file) void startImport(file);
        }}
      />
    </div>
  );
}
