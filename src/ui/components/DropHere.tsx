/**
 * "• Drop here": a place a held item can land (a project in a domain, a card
 * in a column). `active` when it would land here if let go now.
 */
export function DropHere(props: { active: boolean; label?: string; class?: string; height?: number }) {
  return (
    <div
      aria-hidden="true"
      class={`flex items-center justify-center gap-6 rounded-10 border border-dashed text-12 font-medium transition-colors duration-120 ${
        props.active ? 'border-accent bg-primary-tint-45 text-primary-ink' : 'border-line-strong text-body'
      } ${props.class ?? ''}`}
      style={props.height ? { height: `${props.height}px` } : undefined}
    >
      <span class={`size-6 flex-none rounded-full ${props.active ? 'bg-accent' : 'bg-line-strong'}`} />
      {props.label ?? 'Drop here'}
    </div>
  );
}
