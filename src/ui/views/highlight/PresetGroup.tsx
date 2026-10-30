import type { ComponentChildren } from 'preact';

/** A heading over one kind of preset: yours, built in, or your team's. */
export function PresetGroup(props: { heading: string; children: ComponentChildren }) {
  return (
    <div class="grid grid-cols-1 gap-6">
      <h3 class="text-12 font-medium text-body">{props.heading}</h3>
      {props.children}
    </div>
  );
}
