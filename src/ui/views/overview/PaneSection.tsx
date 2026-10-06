import type { ComponentChildren } from 'preact';

/** A titled part of the project pane: Tasks, Resources. */
export function PaneSection(props: { id: string; title: string; class?: string; children: ComponentChildren }) {
  return (
    <section class={props.class} aria-labelledby={props.id}>
      <div class="mb-10 flex items-center justify-between gap-8">
        <h3 id={props.id} class="text-13 font-medium text-slate">
          {props.title}
        </h3>
      </div>
      {props.children}
    </section>
  );
}
