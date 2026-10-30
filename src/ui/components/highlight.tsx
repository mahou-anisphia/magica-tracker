import { useStore } from '../store';

/** The arrival ring: an accent outline that pulses three times, then the store clears it. */
const RING = 'outline-3 outline-offset-4 outline-accent animate-highlight';

/**
 * For a part of a screen that an orb or palette action can point at. Spread
 * `attrs` on it (so `go()` can scroll to it) and add `ring` to its class.
 */
export function useHighlight(key: string): { on: boolean; ring: string; hint?: string; attrs: { 'data-highlight': string } } {
  const h = useStore().highlight;
  const on = h?.key === key;
  return { on, ring: on ? RING : '', hint: on ? h?.hint : undefined, attrs: { 'data-highlight': key } };
}

/** The small "Start here" tag on a highlighted part. Its parent must be positioned. */
export function HintTag(props: { text?: string }) {
  if (!props.text) return null;
  return (
    <span class="pointer-events-none absolute -top-12 right-16 z-10 rounded-full whitespace-nowrap bg-ink px-10 py-2 text-12 font-semibold text-page">
      {props.text}
    </span>
  );
}
