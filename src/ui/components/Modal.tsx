import type { ComponentChildren } from 'preact';
import { useEffect, useRef } from 'preact/hooks';

const DIALOG = 'p-0 bg-card text-slate backdrop:bg-[rgb(26_53_80/0.22)] backdrop:backdrop-blur-[3px]';
const CENTERED = 'm-auto w-[min(460px,calc(100vw-32px))] rounded-18 border border-line shadow-dialog';
// A white sheet from the right over the blurred page.
const DRAWER =
  'fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-none w-[min(440px,100vw)] rounded-none border-l border-line shadow-drawer animate-slide-in';

/**
 * Native <dialog> shown modally: focus is trapped and restored by the browser,
 * Escape and a backdrop click both call onClose. The "drawer" variant slides
 * in from the right edge instead of sitting in the middle.
 */
export function Modal(props: {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  variant?: 'drawer';
  children: ComponentChildren;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (props.open && !d.open) d.showModal();
    if (!props.open && d.open) d.close();
  }, [props.open]);

  return (
    <dialog
      ref={ref}
      class={`${DIALOG} ${props.variant === 'drawer' ? DRAWER : CENTERED}`}
      aria-labelledby={props.labelledBy}
      onCancel={(e) => {
        e.preventDefault();
        props.onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) props.onClose();
      }}
    >
      {props.open && (
        <div
          class={
            props.variant === 'drawer'
              ? 'grid h-full grid-cols-1 grid-rows-[auto_minmax(0,1fr)]'
              : 'grid grid-cols-1 gap-14 px-26 pt-24 pb-22'
          }
        >
          {props.children}
        </div>
      )}
    </dialog>
  );
}
