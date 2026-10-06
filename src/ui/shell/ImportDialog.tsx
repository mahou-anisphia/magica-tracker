import type { Root } from '../../core/schema';
import { Modal } from '../components/Modal';
import { set, type ImportState } from '../store';
import { DialogActions } from './DialogActions';
import { ImportPreview } from './ImportPreview';

export function ImportDialog(props: { state: ImportState | null; current: Root }) {
  const s = props.state;
  const close = () => set({ importState: null });
  return (
    <Modal open={!!s} onClose={close} labelledBy="import-h">
      {s?.kind === 'error' && (
        <>
          <h2 id="import-h" class="text-18">
            Couldn’t import “{s.fileName}”
          </h2>
          <p class="rounded-10 bg-gold-tint px-12 py-8 text-13 text-gold-ink" role="alert">
            {s.error}
          </p>
          <p>Nothing was changed.</p>
          <DialogActions>
            <button type="button" class="btn btn-primary" onClick={close} autoFocus>
              Close
            </button>
          </DialogActions>
        </>
      )}
      {s?.kind === 'preview' && <ImportPreview fileName={s.fileName} incoming={s.incoming} current={props.current} onClose={close} />}
    </Modal>
  );
}
