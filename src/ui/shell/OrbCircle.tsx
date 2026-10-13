import type { ComponentChildren } from 'preact';

/** One round button in the orb's column. */
export function OrbCircle(props: {
  label: string;
  selected?: boolean;
  autoFocus?: boolean;
  expanded?: boolean;
  onHover?: () => void;
  onClick: () => void;
  /** When it rises into place, in ms after the orb opens. */
  delay: number;
  children: ComponentChildren;
}) {
  return (
    <button
      type="button"
      aria-label={props.label}
      title={props.label}
      aria-expanded={props.expanded}
      autoFocus={props.autoFocus}
      style={{ animationDelay: `${props.delay}ms` }}
      class={`inline-flex size-52 flex-none animate-cascade cursor-pointer items-center justify-center rounded-full border-2 shadow-pop ${
        props.selected ? 'border-primary bg-primary text-on-primary' : 'border-line bg-card text-body hover:text-primary-ink'
      }`}
      onMouseEnter={props.onHover}
      onFocus={props.onHover}
      onClick={props.onClick}
    >
      {props.children}
    </button>
  );
}
