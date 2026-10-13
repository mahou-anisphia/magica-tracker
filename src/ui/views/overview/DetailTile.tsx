import type { ComponentChildren } from 'preact';

/** How a tile looks: set, empty (a dashed "+ Add"), or a flag that's raised (tinted). */
export type TileTone = 'set' | 'empty' | 'flag' | 'waiting';

const TONE: Record<TileTone, string> = {
  set: 'border border-line bg-card',
  waiting: 'border border-ink bg-card',
  empty: 'border border-dashed border-line-strong bg-transparent',
  flag: 'border border-transparent bg-primary-tint',
};

/**
 * One tile in More details: a label, its value in a line or two, and a click
 * to open its editor under the row. Open, it gains the accent ring.
 */
export function DetailTile(props: {
  label: string;
  tone: TileTone;
  open: boolean;
  controls: string;
  onToggle: () => void;
  children: ComponentChildren;
}) {
  return (
    <button
      type="button"
      aria-expanded={props.open}
      aria-controls={props.controls}
      class={`grid min-h-72 min-w-0 cursor-pointer content-start gap-2 rounded-12 px-12 py-10 text-left hover:border-accent ${TONE[props.tone]} ${
        props.open ? 'outline-2 outline-offset-1 outline-accent' : ''
      }`}
      onClick={props.onToggle}
    >
      <span class={`text-12 font-medium ${props.tone === 'flag' ? 'text-ink' : 'text-body'}`}>{props.label}</span>
      {props.children}
    </button>
  );
}
