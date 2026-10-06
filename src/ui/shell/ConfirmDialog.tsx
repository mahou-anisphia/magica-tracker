import { Modal } from '../components/Modal';
import type { ConfirmRequest } from '../store';
import { DialogActions } from './DialogActions';

export function ConfirmDialog(props: { request: ConfirmRequest | null }) {
  const r = props.request;
  return (
    <Modal open={!!r} onClose={() => r?.resolve(false)} labelledBy="confirm-h">
      {r && (
        <>
          <h2 id="confirm-h" class="text-18">
            {r.title}
          </h2>
          {r.body && <p>{r.body}</p>}
          <DialogActions>
            {/* Cancel comes first so the dialog focuses it: a stray Enter never deletes. */}
            <button type="button" class="btn btn-quiet" onClick={() => r.resolve(false)}>
              Cancel
            </button>
            <button type="button" class="btn btn-primary" onClick={() => r.resolve(true)}>
              {r.confirmLabel}
            </button>
          </DialogActions>
        </>
      )}
    </Modal>
  );
}
