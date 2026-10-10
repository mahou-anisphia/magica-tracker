import type { ComponentChildren } from 'preact';

/** A section of the Overview's head: a plain label above a white card. */
export function OverviewBlock(props: { id: string; title: string; children: ComponentChildren }) {
  return (
    <section class="mb-52" aria-labelledby={props.id}>
      <div class="mb-12 flex items-baseline justify-between gap-12">
        <h2 id={props.id} class="text-15 font-medium text-body">
          {props.title}
        </h2>
      </div>
      {props.children}
    </section>
  );
}
