import { CARD } from './BoardCard';
import type { DragState } from './useBoardDrag';

/** The held card, lifted, following the pointer. */
export function BoardGhost(props: { drag: DragState }) {
  const d = props.drag;
  return (
    <div
      aria-hidden="true"
      class={`${CARD} pointer-events-none fixed z-30 rotate-1 cursor-grabbing text-ink shadow-pop`}
      style={{ left: `${d.x - d.grabX}px`, top: `${d.y - d.grabY}px`, width: `${d.width}px` }}
    >
      {d.title}
    </div>
  );
}
