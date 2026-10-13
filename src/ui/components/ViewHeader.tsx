import type { ComponentChildren } from 'preact';
import { BackLink } from './BackLink';

/** The top of a screen the orb opens: the way back, a title and a line about it. */
export function ViewHeader(props: { title: string; children?: ComponentChildren }) {
  return (
    <header class="mb-28">
      <BackLink />
      <h1 class="mt-10 mb-4 text-heading leading-[1.2] tracking-[-0.015em]">{props.title}</h1>
      {props.children && <p class="text-15 text-body">{props.children}</p>}
    </header>
  );
}
