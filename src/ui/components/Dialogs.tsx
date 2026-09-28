import { useState } from 'preact/hooks';
import { plural } from '../../core/format';
import type { Root } from '../../core/schema';
import { counts } from '../../core/validate';
import { addBacklogItem, applyImport } from '../actions';
import { set, type ConfirmRequest, type ImportState } from '../store';
import { Modal } from './Modal';

export function ConfirmDialog(props: { request: ConfirmRequest | null }) {
  const r = props.request;
  return (
    <Modal open={!!r} onClose={() => r?.resolve(false)} labelledBy="confirm-h">
      {r && (
        <>
          <h2 id="confirm-h">{r.title}</h2>
          {r.body && <p>{r.body}</p>}
          <div class="actions">
            {/* Cancel comes first so the dialog focuses it: a stray Enter never deletes. */}
            <button type="button" class="btn quiet" onClick={() => r.resolve(false)}>
              Cancel
            </button>
            <button type="button" class="btn primary" onClick={() => r.resolve(true)}>
              {r.confirmLabel}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}

/** `b` from anywhere: drop an idea into the backlog without leaving the page. */
export function CaptureDialog(props: { open: boolean }) {
  const [title, setTitle] = useState('');
  const close = () => {
    setTitle('');
    set({ capture: false });
  };
  return (
    <Modal open={props.open} onClose={close} labelledBy="capture-h">
      <h2 id="capture-h">Add to backlog</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const t = title.trim();
          if (!t) return;
          addBacklogItem(t);
          close();
        }}
        style={{ display: 'grid', gap: '14px' }}
      >
        <label class="field">
          <span class="sr-only">Idea or task</span>
          <input
            type="text"
            value={title}
            onInput={(e) => setTitle(e.currentTarget.value)}
            placeholder="An idea or task for later…"
            autoFocus
            autoComplete="off"
          />
        </label>
        <div class="actions">
          <button type="button" class="btn quiet" onClick={close}>
            Cancel
          </button>
          <button type="submit" class="btn primary">
            Add
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function ImportDialog(props: { state: ImportState | null; current: Root }) {
  const s = props.state;
  const close = () => set({ importState: null });
  return (
    <Modal open={!!s} onClose={close} labelledBy="import-h">
      {s?.kind === 'error' && (
        <>
          <h2 id="import-h">Couldn’t import “{s.fileName}”</h2>
          <p class="field-error" role="alert">
            {s.error}
          </p>
          <p>Nothing was changed.</p>
          <div class="actions">
            <button type="button" class="btn primary" onClick={close} autoFocus>
              Close
            </button>
          </div>
        </>
      )}
      {s?.kind === 'preview' && <ImportPreview fileName={s.fileName} incoming={s.incoming} current={props.current} onClose={close} />}
    </Modal>
  );
}

function ImportPreview(props: { fileName: string; incoming: Root; current: Root; onClose: () => void }) {
  const inc = counts(props.incoming);
  const cur = counts(props.current);
  const row = (label: string, a: number, b: number) => (
    <>
      <span>{label}</span>
      <span class="n">{a}</span>
      <span class="n">{b}</span>
    </>
  );
  return (
    <>
      <h2 id="import-h">Import “{props.fileName}”</h2>
      <div class="import-counts">
        <span />
        <span class="h">In the file</span>
        <span class="h">Here now</span>
        {row('Projects', inc.projects, cur.projects)}
        {row('Tasks', inc.tasks, cur.tasks)}
        {row('Backlog', inc.backlog, cur.backlog)}
      </div>
      <div class="choices">
        <p class="choice">
          <strong>Merge</strong> adds the file’s projects and backlog items. Where the same item is in both, the newer one
          wins.
        </p>
        <p class="choice">
          <strong>Replace</strong> wipes what’s here and uses the file instead. A backup of the current data (
          {plural(cur.projects, 'project')}, {plural(cur.backlog, 'backlog item')}) downloads first.
        </p>
      </div>
      <div class="actions">
        <button type="button" class="btn quiet" onClick={props.onClose}>
          Cancel
        </button>
        <button type="button" class="btn" onClick={() => applyImport('replace')}>
          Replace
        </button>
        <button type="button" class="btn primary" onClick={() => applyImport('merge')} autoFocus>
          Merge
        </button>
      </div>
    </>
  );
}
