import type { ComponentChildren } from 'preact';
import { HintTag, useHighlight } from './highlight';

/**
 * A titled card on the screens the orb opens (Settings, Team, Observatory).
 * The orb can point at it by `highlight` key. `aside` sits right of the title.
 */
export function Panel(props: {
  id: string;
  title: string;
  highlight: string;
  note?: ComponentChildren;
  aside?: ComponentChildren;
  children: ComponentChildren;
}) {
  const h = useHighlight(props.highlight);
  return (
    <section
      {...h.attrs}
      aria-labelledby={props.id}
      class={`relative grid grid-cols-1 content-start gap-14 rounded-14 border border-line bg-card px-22 py-20 shadow-card max-md:px-16 ${h.ring}`}
    >
      <HintTag text={h.hint} />
      <div class="flex flex-wrap items-start gap-x-12 gap-y-8">
        <div class="mr-auto">
          <h2 id={props.id} class="text-17">
            {props.title}
          </h2>
          {props.note && <p class="mt-2 text-13 text-body">{props.note}</p>}
        </div>
        {props.aside}
      </div>
      {props.children}
    </section>
  );
}
