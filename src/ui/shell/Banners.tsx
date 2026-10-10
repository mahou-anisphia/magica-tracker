import { exportNow } from '../actions';
import { set } from '../store';

const BANNER = 'mb-24 flex flex-wrap items-center gap-x-16 gap-y-8 rounded-14 px-18 py-12 text-14';

export function Banners(props: { saving: boolean; notice: string | null }) {
  return (
    <>
      {!props.saving && (
        <div class={`${BANNER} border border-watch bg-watch-tint text-watch-ink`} role="status">
          <p class="flex-[1_1_240px]">
            <strong>Not saving — export before closing.</strong>
          </p>
          <button type="button" class="btn btn-small" onClick={exportNow}>
            Export now
          </button>
        </div>
      )}
      {props.notice && (
        <div class={`${BANNER} border border-line bg-card text-ink`} role="status">
          <p class="flex-[1_1_240px]">{props.notice}</p>
          <button type="button" class="btn btn-quiet btn-small" onClick={() => set({ notice: null })}>
            Dismiss
          </button>
        </div>
      )}
    </>
  );
}
