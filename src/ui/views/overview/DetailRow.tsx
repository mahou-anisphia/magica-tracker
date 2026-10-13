import type { ComponentChildren } from 'preact';

/** One row of DetailRows: its label, its control, and an optional note under the control. */
export function DetailRow(props: { label: string; note?: ComponentChildren; children: ComponentChildren }) {
  return (
    <>
      <span class="pt-8 text-13 font-medium text-body max-md:mt-8 max-md:pt-0">{props.label}</span>
      <div class="grid min-w-0 grid-cols-1 gap-4">
        {props.children}
        {props.note && <span class="text-12 text-body">{props.note}</span>}
      </div>
    </>
  );
}
