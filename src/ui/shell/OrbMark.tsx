/** The brand mark: a ring with a coloured core and a small highlight dot. Lit while open. */
export function OrbMark(props: { lit: boolean }) {
  return (
    <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="12" fill="none" stroke="currentColor" stroke-width="2.5" />
      <circle cx="16" cy="16" r={props.lit ? 5.5 : 4.5} class={props.lit ? 'fill-accent' : 'fill-primary'} />
      <circle cx="24.5" cy="8" r="2.6" class="fill-watch" />
    </svg>
  );
}
