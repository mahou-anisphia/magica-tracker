import type { ComponentChildren } from 'preact';

/** The button row at the foot of a dialog, right-aligned. */
export function DialogActions(props: { children: ComponentChildren }) {
  return <div class="mt-4 flex flex-wrap justify-end gap-8">{props.children}</div>;
}
