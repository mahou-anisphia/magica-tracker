import { useState } from 'preact/hooks';
import { addBacklogItem } from '../actions';
import { Modal } from '../components/Modal';
import { set } from '../store';
import { DialogActions } from './DialogActions';

/** `b` from anywhere: drop an idea into the backlog without leaving the page. */
export function CaptureDialog(props: { open: boolean }) {
  const [title, setTitle] = useState('');
  const close = () => {
    setTitle('');
    set({ capture: false });
  };
  return (
    <Modal open={props.open} onClose={close} labelledBy="capture-h">
      <h2 id="capture-h" class="text-18">
        Add to backlog
      </h2>
      <form
        class="grid gap-14"
        onSubmit={(e) => {
          e.preventDefault();
          const t = title.trim();
          if (!t) return;
          addBacklogItem(t);
          close();
        }}
      >
        <label class="grid grid-cols-1 gap-4 text-13 text-body">
          <span class="sr-only">Idea or task</span>
          <input
            type="text"
            class="min-h-38 rounded-10 border border-line bg-card px-12 py-4 text-15 text-ink focus:border-accent focus:ring-3 focus:ring-accent/18 focus:outline-none max-lg:text-16"
            value={title}
            onInput={(e) => setTitle(e.currentTarget.value)}
            placeholder="An idea or task for later…"
            autoFocus
            autoComplete="off"
          />
        </label>
        <DialogActions>
          <button type="button" class="btn btn-quiet" onClick={close}>
            Cancel
          </button>
          <button type="submit" class="btn btn-primary">
            Add
          </button>
        </DialogActions>
      </form>
    </Modal>
  );
}
