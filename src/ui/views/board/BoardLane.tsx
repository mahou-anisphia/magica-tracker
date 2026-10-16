import type { BoardLane as Lane } from '../../../core/board';
import { plural } from '../../../core/format';
import { openProject } from '../../actions';
import { DropHere } from '../../components/DropHere';
import { BoardCard } from './BoardCard';
import { COLUMNS, GRID } from './columns';
import { CARD_GAP, shiftFor, type DragSource, type DragState } from './useBoardDrag';

/**
 * One project across the columns. Cards move within their own lane only:
 * while one is held, the other lanes fade back. The lane itself is dragged
 * by its name, to reorder the projects.
 */
export function BoardLane(props: {
  lane: Lane;
  drag: DragState | null;
  settling: boolean;
  onPress: (e: PointerEvent, source: DragSource) => void;
  onOpen: (taskId: string) => void;
  /** Lane reordering: where to draw it while one is held, and its handle. */
  shift: number;
  held: boolean;
  laneSettling: boolean;
  onLanePress: (e: PointerEvent) => void;
  laneClickBlocked: () => boolean;
}) {
  const { lane, drag } = props;
  const p = lane.project;
  const open = lane.cells.todo.length + lane.cells.working.length + lane.cells.waiting.length;
  const mine = drag?.projectId === p.id;

  return (
    <section
      data-lane={p.id}
      data-reorder={p.id}
      class={`${GRID} border-t border-line ${drag && !mine ? 'opacity-40' : ''} ${
        props.held
          ? 'relative z-10 rounded-10 bg-card shadow-pop'
          : props.laneSettling
            ? ''
            : 'transition-[transform,opacity] duration-200 ease-out'
      }`}
      style={props.shift ? { transform: `translateY(${props.shift}px)` } : undefined}
      aria-label={p.name}
    >
      <div
        class={`flex items-start gap-8 px-16 py-14 select-none [-webkit-touch-callout:none] max-md:pb-4 ${props.held ? 'cursor-grabbing' : 'cursor-grab'}`}
        title="Drag to reorder projects"
        onPointerDown={props.onLanePress}
        onContextMenu={(e) => e.preventDefault()}
      >
        {lane.needs !== 'later' && (
          <span
            class={`mt-7 size-7 flex-none rounded-full ${lane.needs === 'now' ? 'bg-watch-mark' : 'bg-watch'}`}
            title={lane.needs === 'now' ? 'Something overdue or urgent' : 'Something due soon'}
          />
        )}
        <span class="grid min-w-0 grid-cols-1">
          <button
            type="button"
            class="cursor-pointer bg-transparent p-0 text-left text-15 font-semibold break-words text-ink hover:text-primary-ink"
            title={`Open ${p.name}`}
            onClick={() => {
              if (!props.laneClickBlocked()) openProject(p.id);
            }}
          >
            {p.name}
          </button>
          <span class="text-12 text-body">{open ? plural(open, 'open task') : 'Nothing open'}</span>
        </span>
      </div>
      {COLUMNS.map((col) => {
        const cards = lane.cells[col.status];
        // A column gains a card's height while one is about to land in it.
        const target = mine && drag.target?.status === col.status;
        const grows = target && drag.from !== col.status;
        return (
          <div
            key={col.status}
            data-cell={col.status}
            class={`border-l border-line px-8 py-10 max-md:border-l-0 max-md:px-16 max-md:py-4 ${
              props.settling ? '' : 'transition-[padding] duration-200 ease-out'
            } ${cards.length || mine ? '' : 'max-md:hidden'}`}
            style={grows ? { paddingBottom: `${10 + drag.height + CARD_GAP}px` } : undefined}
          >
            <span class="mb-6 hidden text-12 font-medium text-body max-md:block">{col.label}</span>
            <ul class="relative grid min-h-44 grid-cols-1 content-start gap-8">
              {cards.map((t, i) => (
                <BoardCard
                  key={t.id}
                  task={t}
                  held={drag?.taskId === t.id}
                  shift={shiftFor(drag, p.id, col.status, i, t.id)}
                  animate={!props.settling}
                  onPress={(e) => props.onPress(e, { taskId: t.id, projectId: p.id, title: t.title, status: col.status, index: i })}
                  onOpen={() => props.onOpen(t.id)}
                />
              ))}
              {target && drag.slotTop !== null && (
                <li aria-hidden="true" class="pointer-events-none absolute inset-x-0" style={{ top: `${drag.slotTop}px`, height: `${drag.height}px` }}>
                  <DropHere active class="h-full" />
                </li>
              )}
            </ul>
            {/* While a card of this lane is held, every column shows it can take it; the one it would land in shows the gap instead. */}
            {mine && <DropHere active={false} class={`mt-8 min-h-32 ${target ? 'invisible' : ''}`} />}
          </div>
        );
      })}
    </section>
  );
}
