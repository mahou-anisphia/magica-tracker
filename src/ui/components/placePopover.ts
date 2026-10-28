import { useLayoutEffect } from 'preact/hooks';

const GAP = 6;
const EDGE = 8;

/**
 * Pin a top-layer popover to the button that opens it: below, or above when
 * there is more room there and `maxHeight` doesn't fit below. `align` lines up
 * the left (start) or right (end) edges, kept inside the viewport.
 */
export function placePopover(
  el: HTMLElement | null,
  anchor: HTMLElement | null,
  opts: { width: number; maxHeight: number; align: 'start' | 'end' },
): void {
  if (!el || !anchor) return;
  const r = anchor.getBoundingClientRect();
  const width = Math.min(opts.width, innerWidth - EDGE * 2);
  const want = opts.align === 'end' ? r.right - width : r.left;
  const left = Math.min(Math.max(want, EDGE), innerWidth - width - EDGE);
  const below = innerHeight - r.bottom;
  const up = below < opts.maxHeight && r.top > below;
  el.style.left = `${left}px`;
  el.style.top = up ? 'auto' : `${r.bottom + GAP}px`;
  el.style.bottom = up ? `${innerHeight - r.top + GAP}px` : 'auto';
}

/** While open, follow the anchor through resizes and any scrolling ancestor. */
export function useFollowAnchor(open: boolean, place: () => void): void {
  useLayoutEffect(() => {
    if (!open) return;
    addEventListener('resize', place);
    addEventListener('scroll', place, true); // capture: any scrolling ancestor
    return () => {
      removeEventListener('resize', place);
      removeEventListener('scroll', place, true);
    };
  }, [open]);
}
