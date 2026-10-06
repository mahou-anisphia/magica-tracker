import { useRef } from 'preact/hooks';
import { isExportStale } from '../../core/attention';
import { relativeDays } from '../../core/format';
import { exportNow, startImport } from '../actions';

/** The top bar's right end: when the data was last exported, Export and Import. */
export function Backup(props: { now: Date; lastExportedAt: string | null; hasData: boolean }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const { now, lastExportedAt, hasData } = props;
  // Export is the only backup, so an old or missing export is worth watching.
  const watch = hasData && isExportStale(lastExportedAt, now);

  let exported = '';
  if (lastExportedAt) exported = `Last exported ${relativeDays(lastExportedAt, now)}`;
  else if (hasData) exported = 'Not exported yet';

  return (
    <div class="col-3 flex flex-wrap items-center justify-end gap-8 max-md:col-1 max-md:justify-center">
      {watch ? (
        <span
          class="inline-flex items-center gap-6 rounded-full bg-gold-tint px-10 py-2 text-12 font-medium whitespace-nowrap text-gold-ink inset-ring inset-ring-gold/45 before:size-7 before:flex-none before:rounded-full before:bg-burnished before:content-['']"
          title="Export is the only backup of this data"
        >
          {exported}
        </span>
      ) : (
        exported && <span class="mr-4 text-13 text-slate">{exported}</span>
      )}
      <button type="button" class="btn btn-small" onClick={exportNow}>
        Export
      </button>
      <button type="button" class="btn btn-small" onClick={() => fileRef.current?.click()}>
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
