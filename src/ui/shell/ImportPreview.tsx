import { plural } from '../../core/format';
import type { Root } from '../../core/schema';
import { counts } from '../../core/validate';
import { applyImport } from '../actions';
import { DialogActions } from './DialogActions';

/** What the file holds next to what is here now, and the choice of Merge or Replace. */
export function ImportPreview(props: { fileName: string; incoming: Root; current: Root; onClose: () => void }) {
  const inc = counts(props.incoming);
  const cur = counts(props.current);
  const row = (label: string, a: number, b: number) => (
    <>
      <span>{label}</span>
      <span class="font-medium text-ink">{a}</span>
      <span class="font-medium text-ink">{b}</span>
    </>
  );
  return (
    <>
      <h2 id="import-h" class="text-18">
        Import “{props.fileName}”
      </h2>
      <div class="grid grid-cols-[auto_1fr_1fr] gap-x-16 gap-y-4 text-14 tabular-nums">
        <span />
        <span class="text-12 text-body">In the file</span>
        <span class="text-12 text-body">Here now</span>
        {row('Projects', inc.projects, cur.projects)}
        {row('Tasks', inc.tasks, cur.tasks)}
        {row('Backlog', inc.backlog, cur.backlog)}
      </div>
      <div class="grid grid-cols-1 gap-8">
        <p class="rounded-10 bg-page px-14 py-10 text-13">
          <strong class="font-semibold text-ink">Merge</strong> adds the file’s projects and backlog items. Where the
          same item is in both, the newer one wins.
        </p>
        <p class="rounded-10 bg-page px-14 py-10 text-13">
          <strong class="font-semibold text-ink">Replace</strong> wipes what’s here and uses the file instead. A backup
          of the current data ({plural(cur.projects, 'project')}, {plural(cur.backlog, 'backlog item')}) downloads
          first.
        </p>
      </div>
      <DialogActions>
        <button type="button" class="btn btn-quiet" onClick={props.onClose}>
          Cancel
        </button>
        <button type="button" class="btn" onClick={() => applyImport('replace')}>
          Replace
        </button>
        <button type="button" class="btn btn-primary" onClick={() => applyImport('merge')} autoFocus>
          Merge
        </button>
      </DialogActions>
    </>
  );
}
