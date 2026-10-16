import { CARD } from './BoardCard';
import type { DragState } from './useBoardDrag';

/** The held card, lifted, hanging just below and right of the pointer so the gap it would fill stays in sight. */
export function BoardGhost(props: { drag: DragState }) {
  const d = props.drag;
  return (
    <div
      aria-hidden="true"
      class={`${CARD} pointer-events-none fixed z-30 rotate-1 cursor-grabbing text-ink opacity-90 shadow-pop`}
      style={{ left: `${d.x + 14}px`, top: `${d.y + 12}px`, width: `${d.width}px` }}
    >
      {d.title}
    </div>
  );
}
