import { EXPORT_STALE_DAYS } from '../../../core/attention';
import type { Backend } from '../../../storage/data';
import { exportNow, wipeEverything } from '../../actions';
import { Panel } from '../../components/Panel';

const dayFormat = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

const BACKEND: Record<Backend, string> = {
  indexeddb: 'This browser’s database (IndexedDB)',
  localStorage: 'This browser’s local storage',
};

/** Where the data lives, the export reminder, and wiping it. */
export function StorageCard(props: { storage: { backend: Backend; migratedAt?: string } | null }) {
  const s = props.storage;
  return (
    <Panel id="storage-h" title="Storage and backup" highlight="settings-data" note="Nothing leaves this device. Export is your backup.">
      <dl class="grid grid-cols-1 gap-8 text-14">
        <div class="flex flex-wrap justify-between gap-x-12">
          <dt class="text-ink">Saved in</dt>
          <dd class="text-body">{s ? BACKEND[s.backend] : '—'}</dd>
        </div>
        {s?.migratedAt && (
          <div class="flex flex-wrap justify-between gap-x-12">
            <dt class="text-ink">Moved from local storage</dt>
            <dd class="text-body">{dayFormat.format(new Date(s.migratedAt))}, original kept as a backup</dd>
          </div>
        )}
        <div class="flex flex-wrap justify-between gap-x-12">
          <dt class="text-ink">Export reminder</dt>
          <dd class="text-body">After {EXPORT_STALE_DAYS} days without one</dd>
        </div>
      </dl>
      <div class="flex flex-wrap items-center gap-8 border-t border-line pt-12">
        <button type="button" class="btn btn-small" onClick={exportNow}>
          Export now
        </button>
        <button type="button" class="btn btn-quiet btn-small btn-danger ml-auto" onClick={() => void wipeEverything()}>
          Wipe everything…
        </button>
      </div>
    </Panel>
  );
}
