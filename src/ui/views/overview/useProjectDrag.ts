import { useEffect, useRef, useState } from 'preact/hooks';

/**
 * Where a held project would land: in a domain (undefined: Uncategorized),
 * just before a project or at the end; or on an uncategorized project, to
 * group the two into a new domain.
 */
export type ProjectDropTarget =
  | { kind: 'insert'; domainId: string | undefined; beforeId: string | null }
  | { kind: 'merge'; projectId: string };

export type ProjectDrag = {
  id: string;
  name: string;
  /** The row's size and where the pointer holds it, so the floating copy matches. */
  width: number;
  grabX: number;
  grabY: number;
  /** The pointer, in viewport pixels. */
  x: number;
  y: number;
  target: ProjectDropTarget | null;
  /** Where to draw the "drop here" line between two rows, in viewport pixels. */
  line: { top: number; left: number; width: number } | null;
};

/** A mouse drag starts after this much movement; less is a click. */
const MOUSE_SLOP = 5;
/** A touch drag starts after a press this long without moving; moving sooner scrolls the page. */
const LONG_PRESS_MS = 280;
const TOUCH_SLOP = 8;
/** Near the top or bottom edge the page scrolls, this fast per frame. */
const EDGE = 64;
const EDGE_SPEED = 14;
/** The middle of an uncategorized row, as a share of its height, groups instead of inserting. */
const MERGE_FROM = 0.28;
/** How far beside the list the pointer may stray and still aim at it. */
const SIDE = 48;

const domainOfEl = (el: HTMLElement) => el.dataset.domain || undefined;

/**
 * What lies under the pointer. The sidebar marks its rows `data-project`
 * (with `data-domain`), each group's heading `data-group-head` and its end
 * slot `data-group-end` (both with `data-domain`). Measured live, and nothing
 * moves under the pointer while dragging, so the target never flickers.
 */
function aim(heldId: string, x: number, y: number): Pick<ProjectDrag, 'target' | 'line'> {
  const nav = document.getElementById('sidebar');
  if (!nav) return { target: null, line: null };
  const rows = [...nav.querySelectorAll<HTMLElement>('[data-project]')];
  const within = (r: DOMRect, pad = 0) => y >= r.top - pad && y < r.bottom + pad && x >= r.left - SIDE && x <= r.right + SIDE;
  const nextInGroup = (i: number) => {
    const next = rows[i + 1];
    return next && domainOfEl(next) === domainOfEl(rows[i]!) ? next : null;
  };
  const heldIndex = rows.findIndex((r) => r.dataset.project === heldId);
  const held = rows[heldIndex];
  /** Dropping right where it already is changes nothing: no target. */
  const noop = (domainId: string | undefined, beforeId: string | null) =>
    !!held &&
    domainOfEl(held) === domainId &&
    (beforeId === heldId || beforeId === (nextInGroup(heldIndex)?.dataset.project ?? null));
  const insert = (domainId: string | undefined, beforeId: string | null, line: ProjectDrag['line']) =>
    noop(domainId, beforeId) ? { target: null, line: null } : { target: { kind: 'insert' as const, domainId, beforeId }, line };

  for (const [i, row] of rows.entries()) {
    const r = row.getBoundingClientRect();
    if (!within(r, 1)) continue;
    const id = row.dataset.project!;
    if (id === heldId) return { target: null, line: null };
    const domainId = domainOfEl(row);
    const rel = (y - r.top) / r.height;
    if (!domainId && rel > MERGE_FROM && rel < 1 - MERGE_FROM) return { target: { kind: 'merge', projectId: id }, line: null };
    const before = rel < 0.5;
    const beforeId = before ? id : (nextInGroup(i)?.dataset.project ?? null);
    return insert(domainId, beforeId, { top: before ? r.top - 1 : r.bottom + 1, left: r.left, width: r.width });
  }
  for (const head of nav.querySelectorAll<HTMLElement>('[data-group-head]')) {
    const r = head.getBoundingClientRect();
    if (!within(r, 2)) continue;
    const domainId = domainOfEl(head);
    const first = rows.find((row) => domainOfEl(row) === domainId);
    if (!first) return insert(domainId, null, null);
    const f = first.getBoundingClientRect();
    return insert(domainId, first.dataset.project!, { top: f.top - 1, left: f.left, width: f.width });
  }
  for (const end of nav.querySelectorAll<HTMLElement>('[data-group-end]')) {
    if (within(end.getBoundingClientRect(), 4)) return insert(domainOfEl(end), null, null);
  }
  return { target: null, line: null };
}

/**
 * Dragging projects in the sidebar, by pointer: a mouse drag starts after a
 * few pixels, a touch drag after a long press (a quick swipe still scrolls).
 * A copy follows the pointer and `drag.target` says where it would land.
 * Escape, or letting go over nothing, puts it back.
 */
export function useProjectDrag(opts: { onDrop: (id: string, target: ProjectDropTarget) => void }) {
  const [drag, setDrag] = useState<ProjectDrag | null>(null);
  const dragRef = useRef<ProjectDrag | null>(null);
  const pending = useRef<{ id: string; name: string; el: HTMLElement; x0: number; y0: number; touch: boolean; timer?: ReturnType<typeof setTimeout> } | null>(null);
  /** A drag just ended: the click that follows the release must not open the project. */
  const suppressClick = useRef(false);
  const onDrop = useRef(opts.onDrop);
  onDrop.current = opts.onDrop;

  const update = (next: ProjectDrag | null) => {
    dragRef.current = next;
    setDrag(next);
  };
  const retarget = (d: ProjectDrag): ProjectDrag => ({ ...d, ...aim(d.id, d.x, d.y) });

  const activate = (x: number, y: number) => {
    const p = pending.current;
    if (!p) return;
    clearTimeout(p.timer);
    pending.current = null;
    const r = p.el.getBoundingClientRect();
    update({ id: p.id, name: p.name, width: r.width, grabX: p.x0 - r.left, grabY: p.y0 - r.top, x, y, target: null, line: null });
    navigator.vibrate?.(8);
    // Aim once the drop slots that appear while dragging are in place.
    requestAnimationFrame(() => {
      if (dragRef.current) update(retarget(dragRef.current));
    });
  };

  const finish = (drop: boolean) => {
    const d = dragRef.current;
    update(null);
    if (!d) return;
    suppressClick.current = true;
    setTimeout(() => (suppressClick.current = false), 0);
    if (drop && d.target) onDrop.current(d.id, d.target);
  };

  useEffect(() => {
    let frame = 0;
    const edgeScroll = () => {
      const d = dragRef.current;
      if (!d) {
        frame = 0;
        return;
      }
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
    const end = (drop: boolean) => () => {
      if (pending.current) {
        clearTimeout(pending.current.timer);
        pending.current = null;
      }
      if (dragRef.current) finish(drop);
    };
    const up = end(true);
    const cancel = end(false);
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dragRef.current) {
        e.preventDefault();
        e.stopPropagation();
        finish(false);
      }
    };
    // While a project is held on a touch screen, the finger moves it, not the page.
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

  /** For a row's onPointerDown. */
  const press = (e: PointerEvent, id: string, name: string) => {
    if (e.button !== 0 || dragRef.current) return;
    const el = e.currentTarget as HTMLElement;
    const touch = e.pointerType !== 'mouse';
    pending.current = { id, name, el, x0: e.clientX, y0: e.clientY, touch };
    if (touch) pending.current.timer = setTimeout(() => activate(e.clientX, e.clientY), LONG_PRESS_MS);
  };

  return { drag, press, suppressClick };
}
