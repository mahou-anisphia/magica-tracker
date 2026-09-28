import type { ComponentChildren } from 'preact';
import { useEffect, useRef } from 'preact/hooks';

/**
 * Native <dialog> shown modally: focus is trapped and restored by the browser,
 * Escape and a backdrop click both call onClose.
 */
export function Modal(props: { open: boolean; onClose: () => void; labelledBy: string; children: ComponentChildren }) {
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
      aria-labelledby={props.labelledBy}
      onCancel={(e) => {
        e.preventDefault();
        props.onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) props.onClose();
      }}
    >
      {props.open && <div class="dialog-body">{props.children}</div>}
    </dialog>
  );
}
