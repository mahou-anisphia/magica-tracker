import { plural } from '../../../core/format';
import type { Root } from '../../../core/schema';
import type { Team } from '../../../core/team';
import { applyTeamImport } from '../../actions';
import { Modal } from '../../components/Modal';
import { set, type TeamImportRow } from '../../store';
import { importOutcome } from './importOutcome';
import { ImportRow } from './ImportRow';

/**
 * The files just chosen, each matched to a person. Nothing is kept until
 * Import; each file stays read-only and never mixes with your own projects.
 */
export function TeamImportDialog(props: { rows: TeamImportRow[] | null; team: Team; mine: Root }) {
  const rows = props.rows ?? [];
  const close = () => set({ teamImport: null });
  const n = rows.filter((r) => importOutcome(r, props.team, props.mine).tone === 'good').length;

  return (
    <Modal open={!!props.rows} onClose={close} labelledBy="team-import-h" variant="wide">
      <div>
        <h2 id="team-import-h" class="text-18">
          Import their files
        </h2>
        <p class="mt-4 text-14 text-body">
          Each file is matched to a person and kept read-only. It never mixes with your own projects.
        </p>
      </div>
      <ul class="-mx-26 border-y border-line max-md:-mx-26">
        {rows.map((r) => (
          <ImportRow key={r.key} row={r} team={props.team} mine={props.mine} />
        ))}
      </ul>
      <div class="flex flex-wrap items-center gap-10">
        <span class="mr-auto text-13 text-body">A newer file replaces that person’s copy. An older one is skipped.</span>
        <button type="button" class="btn btn-quiet" onClick={close}>
          Cancel
        </button>
        <button type="button" class="btn btn-primary" disabled={n === 0} onClick={applyTeamImport} autoFocus>
          {n ? `Import ${plural(n, 'file')}` : 'Nothing to import'}
        </button>
      </div>
    </Modal>
  );
}
