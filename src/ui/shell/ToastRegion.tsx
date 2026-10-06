import type { Toast } from '../store';

/** The live region is always present so screen readers announce new toasts. */
export function ToastRegion(props: { toast: Toast | null }) {
  const t = props.toast;
  return (
    <div
      class="pointer-events-none fixed bottom-[calc(24px+env(safe-area-inset-bottom,0px))] left-1/2 z-30 w-max max-w-[calc(100vw-32px)] -translate-x-1/2"
      role="status"
      aria-live="polite"
    >
      {t && (
        <div
          key={t.id}
          class={`pointer-events-auto flex animate-rise items-center gap-12 rounded-full bg-deep py-8 pl-18 text-14 text-mist shadow-toast ${t.action ? 'pr-8' : 'pr-18'}`}
        >
          <span>{t.text}</span>
          {t.action && (
            <button
              type="button"
              class="btn btn-small min-h-28 rounded-full border-transparent bg-transparent text-frost hover:border-transparent hover:bg-white/12 hover:text-white max-lg:min-h-44"
              onClick={t.action.run}
            >
              {t.action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
