import type { ProjectDrag } from './useProjectDrag';

/** The floating copy hangs just below and right of the pointer, so where it would land stays in sight. */
const HANG_X = 14;
const HANG_Y = 12;

/**
 * What floats while a project is held: its name by the pointer (and what it
 * would group with) and, when it would land between two projects, a line
 * there with a dot and "Drop here".
 */
export function ProjectDragLayer(props: { drag: ProjectDrag; mergeName?: string }) {
  const d = props.drag;
  return (
    <>
      {d.line && (
        <div
          aria-hidden="true"
          class="pointer-events-none fixed z-30 flex items-center"
          style={{ top: `${d.line.top - 4}px`, left: `${d.line.left}px`, width: `${d.line.width}px` }}
        >
          <span class="-ml-4 size-8 flex-none rounded-full bg-accent" />
          <span class="h-2 flex-1 bg-accent" />
          <span class="absolute top-1/2 right-0 -translate-y-1/2 rounded-full bg-card px-6 text-11 font-medium text-primary-ink shadow-segment">
            Drop here
          </span>
        </div>
      )}
      <div
        aria-hidden="true"
        class="pointer-events-none fixed z-30 grid min-h-(--tap) rotate-1 cursor-grabbing grid-cols-[8px_minmax(0,1fr)] items-center gap-x-10 rounded-10 border border-line bg-card/90 px-12 py-4 font-medium text-ink shadow-pop"
        style={{ left: `${d.x + HANG_X}px`, top: `${d.y + HANG_Y}px`, width: `${d.width}px` }}
      >
        <span class="size-8 rounded-full border-[1.5px] border-ink bg-ink" />
        <span class="truncate">{d.name}</span>
        {props.mergeName && <span class="col-start-2 truncate text-12 font-normal text-primary-ink">Group with {props.mergeName}</span>}
      </div>
    </>
  );
}
