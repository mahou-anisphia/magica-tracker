import { useEffect, useRef, useState } from 'preact/hooks';
import type { Status } from '../../../core/schema';

/** Where a dragged card would land: a column of its lane, and a place in it. */
export type DragTarget = { status: Status; index: number };

export type DragState = {
  taskId: string;
  projectId: string;
  title: string;
  from: Status;
  fromIndex: number;
  /** The card's size, and where the pointer holds it, so the floating copy matches. */
  width: number;
  height: number;
  grabX: number;
  grabY: number;
  /** The pointer, in viewport pixels. */
  x: number;
  y: number;
  target: DragTarget | null;
  /** Where the gap for it opens in the target column, from the top of that column's list. */
  slotTop: number | null;
};

export type DragSource = { taskId: string; projectId: string; title: string; status: Status; index: number };

/** The space between cards in a column (gap-8): a card stepping aside moves by its height plus this. */
export const CARD_GAP = 8;
/** A mouse drag starts after this much movement; less is a click. */
const MOUSE_SLOP = 5;
/** A touch drag starts after a press this long without moving; moving sooner scrolls the page. */
const LONG_PRESS_MS = 280;
const TOUCH_SLOP = 8;
/** Near the top or bottom edge the page scrolls, this fast per frame. */
const EDGE = 64;
const EDGE_SPEED = 14;
/** A drop this far from every column of the lane goes nowhere. */
const REACH = 140;

type CellLayout = {
  status: Status;
  left: number;
  right: number;
  top: number;
  bottom: number;
  mids: { id: string; mid: number }[];
  heights: { id: string; height: number }[];
};

/** The lane's columns and cards where they sit now, in page coordinates (so scrolling doesn't move them). */
function measure(projectId: string): CellLayout[] {
  const lane = document.querySelector(`[data-lane="${CSS.escape(projectId)}"]`);
  if (!lane) return [];
  return [...lane.querySelectorAll<HTMLElement>('[data-cell]')].map((cell) => {
    const r = cell.getBoundingClientRect();
    return {
      status: cell.dataset.cell as Status,
      left: r.left + scrollX,
      right: r.right + scrollX,
      top: r.top + scrollY,
      bottom: r.bottom + scrollY,
      mids: [...cell.querySelectorAll<HTMLElement>('[data-card]')].map((card) => {
        const c = card.getBoundingClientRect();
        return { id: card.dataset.card!, mid: c.top + scrollY + c.height / 2 };
      }),
      heights: [...cell.querySelectorAll<HTMLElement>('[data-card]')].map((card) => ({
        id: card.dataset.card!,
        height: card.getBoundingClientRect().height,
      })),
    };
  });
}

function targetAt(layout: CellLayout[], taskId: string, px: number, py: number): DragTarget | null {
  let best: CellLayout | null = null;
  let bestDist = Infinity;
  for (const cell of layout) {
    const dx = px < cell.left ? cell.left - px : px > cell.right ? px - cell.right : 0;
    const dy = py < cell.top ? cell.top - py : py > cell.bottom ? py - cell.bottom : 0;
    const d = Math.hypot(dx, dy);
    if (d < bestDist) {
      best = cell;
      bestDist = d;
    }
  }
  if (!best || bestDist > REACH) return null;
  // Done is ordered by when things were finished, so a card always lands on top.
  if (best.status === 'done') return { status: 'done', index: 0 };
  const index = best.mids.filter((m) => m.id !== taskId && m.mid < py).length;
  return { status: best.status, index };
}

/** How far down its column's list the gap for the held card opens: the cards above it, and their gaps. */
function slotTopFor(layout: CellLayout[], taskId: string, target: DragTarget | null): number | null {
  const cell = target && layout.find((c) => c.status === target.status);
  if (!cell) return null;
  const above = cell.heights.filter((c) => c.id !== taskId).slice(0, target.index);
  return above.reduce((y, c) => y + c.height + CARD_GAP, 0);
}

/**
 * Dragging cards on the Board, by pointer: a mouse drag starts after a few
 * pixels, a touch drag after a long press (a quick swipe still scrolls). While
 * a card is held, a copy follows the pointer and `target` says where it would
 * land; the lane draws the gap, with "Drop here" in it at `slotTop`. Escape, or letting go far from the lane, puts
 * it back. `settling` is true for the frames right after a drop, so cards
 * take their new places without animating from the old ones.
 */
export function useBoardDrag(opts: { onDrop: (drag: DragState, target: DragTarget) => void }) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const [settling, setSettling] = useState(false);
  const dragRef = useRef<DragState | null>(null);
  const layout = useRef<CellLayout[]>([]);
  const pending = useRef<{ source: DragSource; el: HTMLElement; x0: number; y0: number; touch: boolean; timer?: ReturnType<typeof setTimeout> } | null>(
    null,
  );
  /** A drag just ended: the click that follows the release must not open the card. */
  const suppressClick = useRef(false);
  const onDrop = useRef(opts.onDrop);
  onDrop.current = opts.onDrop;

  const update = (next: DragState | null) => {
    dragRef.current = next;
    setDrag(next);
  };

  const retarget = (d: DragState) => {
    const target = targetAt(layout.current, d.taskId, d.x + scrollX, d.y + scrollY);
    return { ...d, target, slotTop: slotTopFor(layout.current, d.taskId, target) };
  };

  const activate = (x: number, y: number) => {
    const p = pending.current;
    if (!p) return;
    clearTimeout(p.timer);
    pending.current = null;
    const r = p.el.getBoundingClientRect();
    update({
      taskId: p.source.taskId,
      projectId: p.source.projectId,
      title: p.source.title,
      from: p.source.status,
      fromIndex: p.source.index,
      width: r.width,
      height: r.height,
      grabX: p.x0 - r.left,
      grabY: p.y0 - r.top,
      x,
      y,
      target: { status: p.source.status, index: p.source.index },
      slotTop: null,
    });
    navigator.vibrate?.(8);
    // Measure once the lane has shown every column (phones hide empty ones).
    requestAnimationFrame(() => {
      layout.current = measure(p.source.projectId);
      if (dragRef.current) update(retarget(dragRef.current));
    });
  };

  const finish = (drop: boolean) => {
    const d = dragRef.current;
    update(null);
    layout.current = [];
    if (!d) return;
    suppressClick.current = true;
    setTimeout(() => (suppressClick.current = false), 0);
    setSettling(true);
    requestAnimationFrame(() => requestAnimationFrame(() => setSettling(false)));
    if (drop && d.target) onDrop.current(d, d.target);
  };

  useEffect(() => {
    let frame = 0;
    const edgeScroll = () => {
      const d = dragRef.current;
      if (!d) return;
      const step = d.y < EDGE ? -EDGE_SPEED : d.y > innerHeight - EDGE ? EDGE_SPEED : 0;
      if (step) {
        scrollBy(0, step);
        update(retarget(d));
      }
      frame = requestAnimationFrame(edgeScroll);
    };
    const move = (e: PointerEvent) => {
      const p = pending.current;
      if (p) {
        const dist = Math.hypot(e.clientX - p.x0, e.clientY - p.y0);
        if (!p.touch && dist > MOUSE_SLOP) activate(e.clientX, e.clientY);
        else if (p.touch && dist > TOUCH_SLOP) {
          // Moved before the long press: the page is scrolling, not a drag.
          clearTimeout(p.timer);
          pending.current = null;
        }
        return;
      }
      const d = dragRef.current;
      if (!d) return;
      update(retarget({ ...d, x: e.clientX, y: e.clientY }));
      if (!frame) frame = requestAnimationFrame(edgeScroll);
    };
    const up = () => {
      if (pending.current) {
        clearTimeout(pending.current.timer);
        pending.current = null;
      }
      if (dragRef.current) finish(true);
    };
    const cancel = () => {
      if (pending.current) {
        clearTimeout(pending.current.timer);
        pending.current = null;
      }
      if (dragRef.current) finish(false);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dragRef.current) {
        e.preventDefault();
        e.stopPropagation();
        finish(false);
      }
    };
    // While a card is held on a touch screen, the finger moves the card, not the page.
    const touchMove = (e: TouchEvent) => {
      if (dragRef.current) e.preventDefault();
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

  /** For a card's onPointerDown. */
  const press = (e: PointerEvent, source: DragSource) => {
    if (e.button !== 0 || dragRef.current) return;
    const el = e.currentTarget as HTMLElement;
    const touch = e.pointerType !== 'mouse';
    pending.current = { source, el, x0: e.clientX, y0: e.clientY, touch };
    if (touch) pending.current.timer = setTimeout(() => activate(e.clientX, e.clientY), LONG_PRESS_MS);
  };

  return { drag, settling, press, suppressClick };
}

/**
 * How far a card steps aside while another is held: up to close the gap the
 * held card left in its column, down to open one where it would land.
 */
export function shiftFor(drag: DragState | null, projectId: string, status: Status, index: number, taskId: string): number {
  if (!drag || drag.projectId !== projectId || !drag.target || taskId === drag.taskId) return 0;
  const removed = status === drag.from && index > drag.fromIndex;
  const at = removed ? index - 1 : index;
  const inserted = status === drag.target.status && at >= drag.target.index;
  return ((inserted ? 1 : 0) - (removed ? 1 : 0)) * (drag.height + CARD_GAP);
}
