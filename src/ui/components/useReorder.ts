import { useEffect, useRef, useState } from 'preact/hooks';

/** A mouse drag starts after this much movement; less is a click. */
const MOUSE_SLOP = 5;
/** A touch drag starts after a press this long without moving; moving sooner scrolls the page. */
const LONG_PRESS_MS = 280;
const TOUCH_SLOP = 8;
/** Near the top or bottom edge the page scrolls, this fast per frame. */
const EDGE = 64;
const EDGE_SPEED = 14;

type Item = { id: string; top: number; height: number };

type Held = {
  id: string;
  from: number;
  /** Where the pointer started, in page pixels, and where it is now. */
  y0: number;
  y: number;
  to: number;
  /** How far the others step aside: the held item's height plus the gap. */
  step: number;
};

/**
 * Drag to reorder a vertical list (the Board's lanes, the project list).
 * Items carry `data-reorder={id}` inside an element with
 * `data-reorder-list={list}`. A mouse drag starts after a few pixels, a touch
 * drag after a long press (a quick swipe still scrolls). The held item
 * follows the pointer and the others slide aside; letting go calls
 * `onReorder` with the new order. Escape puts it back. `settling` is true
 * for the frames right after a drop, so items take their places without
 * animating from the old ones.
 */
export function useReorder(opts: { list: string; ids: string[]; onReorder: (ids: string[]) => void }) {
  const [held, setHeld] = useState<Held | null>(null);
  const [settling, setSettling] = useState(false);
  const heldRef = useRef<Held | null>(null);
  const items = useRef<Item[]>([]);
  const pending = useRef<{ id: string; x0: number; y0: number; touch: boolean; timer?: ReturnType<typeof setTimeout> } | null>(null);
  const suppressClick = useRef(false);
  const latest = useRef(opts);
  latest.current = opts;

  const set = (next: Held | null) => {
    heldRef.current = next;
    setHeld(next);
  };

  /** The index the held item would land at, from where its middle is now. */
  const landing = (h: Held) => {
    const self = items.current[h.from]!;
    const mid = self.top + self.height / 2 + (h.y - h.y0);
    return items.current.filter((it, i) => i !== h.from && it.top + it.height / 2 < mid).length;
  };

  const measure = (list: string) => {
    const root = document.querySelector(`[data-reorder-list="${CSS.escape(list)}"]`);
    items.current = root
      ? [...root.querySelectorAll<HTMLElement>('[data-reorder]')].map((el) => {
          const r = el.getBoundingClientRect();
          return { id: el.dataset.reorder!, top: r.top + scrollY, height: r.height };
        })
      : [];
  };

  const activate = () => {
    const p = pending.current;
    if (!p) return;
    clearTimeout(p.timer);
    pending.current = null;
    measure(latest.current.list);
    const from = items.current.findIndex((it) => it.id === p.id);
    if (from < 0) return;
    const self = items.current[from]!;
    const next = items.current[from + 1] ?? items.current[from - 1];
    const gap = next ? Math.abs(next.top - self.top) - (next.top > self.top ? self.height : next.height) : 0;
    const y0 = p.y0 + scrollY;
    set({ id: p.id, from, y0, y: y0, to: from, step: self.height + Math.max(gap, 0) });
    navigator.vibrate?.(8);
  };

  const finish = (drop: boolean) => {
    const h = heldRef.current;
    set(null);
    if (!h) return;
    suppressClick.current = true;
    setTimeout(() => (suppressClick.current = false), 0);
    setSettling(true);
    requestAnimationFrame(() => requestAnimationFrame(() => setSettling(false)));
    if (!drop || h.to === h.from) return;
    const ids = items.current.map((it) => it.id);
    const [moved] = ids.splice(h.from, 1);
    ids.splice(h.to, 0, moved!);
    latest.current.onReorder(ids);
  };

  useEffect(() => {
    let frame = 0;
    const follow = (clientY: number) => {
      const h = heldRef.current;
      if (!h) return;
      const moved = { ...h, y: clientY + scrollY };
      set({ ...moved, to: landing(moved) });
    };
    let lastY = 0;
    const edgeScroll = () => {
      if (!heldRef.current) {
        frame = 0;
        return;
      }
      const step = lastY < EDGE ? -EDGE_SPEED : lastY > innerHeight - EDGE ? EDGE_SPEED : 0;
      if (step) {
        scrollBy(0, step);
        follow(lastY);
      }
      frame = requestAnimationFrame(edgeScroll);
    };
    const move = (e: PointerEvent) => {
      const p = pending.current;
      if (p) {
        const dist = Math.hypot(e.clientX - p.x0, e.clientY - p.y0);
        if (!p.touch && dist > MOUSE_SLOP) activate();
        else if (p.touch && dist > TOUCH_SLOP) {
          clearTimeout(p.timer);
          pending.current = null;
        }
      }
      if (!heldRef.current) return;
      lastY = e.clientY;
      follow(e.clientY);
      if (!frame) frame = requestAnimationFrame(edgeScroll);
    };
    const end = (drop: boolean) => () => {
      if (pending.current) {
        clearTimeout(pending.current.timer);
        pending.current = null;
      }
      if (heldRef.current) finish(drop);
    };
    const up = end(true);
    const cancel = end(false);
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && heldRef.current) {
        e.preventDefault();
        e.stopPropagation();
        finish(false);
      }
    };
    const touchMove = (e: TouchEvent) => {
      if (heldRef.current) e.preventDefault();
    };
    addEventListener('pointermove', move);
    addEventListener('pointerup', up);
    addEventListener('pointercancel', cancel);
    addEventListener('keydown', key, true);
    addEventListener('touchmove', touchMove, { passive: false });
    return () => {
      cancelAnimationFrame(frame);
      removeEventListener('pointermove', move);
      removeEventListener('pointerup', up);
      removeEventListener('pointercancel', cancel);
      removeEventListener('keydown', key, true);
      removeEventListener('touchmove', touchMove);
    };
  }, []);

  /** For the handle's onPointerDown. */
  const press = (e: PointerEvent, id: string) => {
    if (e.button !== 0 || heldRef.current) return;
    e.stopPropagation();
    const touch = e.pointerType !== 'mouse';
    pending.current = { id, x0: e.clientX, y0: e.clientY, touch };
    if (touch) pending.current.timer = setTimeout(activate, LONG_PRESS_MS);
  };

  /** Where an item is drawn while something is held: the held one under the pointer, the rest stepping aside. */
  const offset = (id: string): number => {
    const h = held;
    if (!h) return 0;
    const i = latest.current.ids.indexOf(id);
    if (id === h.id) return h.y - h.y0;
    if (h.to > h.from && i > h.from && i <= h.to) return -h.step;
    if (h.to < h.from && i >= h.to && i < h.from) return h.step;
    return 0;
  };

  return { held: held?.id ?? null, settling, press, offset, suppressClick };
}
