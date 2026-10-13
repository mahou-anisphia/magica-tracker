import type { ComponentChildren } from 'preact';
import { HintTag, useHighlight } from '../../components/highlight';

/** One group of settings; the orb can point at it by `highlight` key. */
export function SettingsCard(props: { id: string; title: string; highlight: string; note?: string; children: ComponentChildren }) {
  const h = useHighlight(props.highlight);
  return (
    <section
      {...h.attrs}
      aria-labelledby={props.id}
      class={`relative grid grid-cols-1 content-start gap-14 rounded-14 border border-line bg-card px-22 py-20 shadow-card ${h.ring}`}
    >
      <HintTag text={h.hint} />
      <div>
        <h2 id={props.id} class="text-17">
          {props.title}
        </h2>
        {props.note && <p class="mt-2 text-13 text-body">{props.note}</p>}
      </div>
      {props.children}
    </section>
  );
}
