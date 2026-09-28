import { exportNow } from '../actions';
import { set, type Toast } from '../store';

export function Banners(props: { saving: boolean; notice: string | null }) {
  return (
    <>
      {!props.saving && (
        <div class="banner not-saving" role="status">
          <p>
            <strong>Not saving — export before closing.</strong>
          </p>
          <button type="button" class="btn small" onClick={exportNow}>
            Export now
          </button>
        </div>
      )}
      {props.notice && (
        <div class="banner notice" role="status">
          <p>{props.notice}</p>
          <button type="button" class="btn quiet small" onClick={() => set({ notice: null })}>
            Dismiss
          </button>
        </div>
      )}
    </>
  );
}

/** The live region is always present so screen readers announce new toasts. */
export function ToastRegion(props: { toast: Toast | null }) {
  const t = props.toast;
  return (
    <div class="toast-region" role="status" aria-live="polite">
      {t && (
        <div key={t.id} class={`toast ${t.action ? '' : 'plain'}`}>
          <span>{t.text}</span>
          {t.action && (
            <button type="button" class="btn small" onClick={t.action.run}>
              {t.action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
