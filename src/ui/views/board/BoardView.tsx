import { useState } from 'preact/hooks';
import { board } from '../../../core/board';
import type { Root } from '../../../core/schema';
import { BackLink } from '../../components/BackLink';
import { HintTag, useHighlight } from '../../components/highlight';
import { BoardLane } from './BoardLane';
import { BoardStrip } from './BoardStrip';
import { COLUMNS, GRID, type Dragging } from './columns';

/**
 * The Board, from the orb: every active project as a lane, its tasks in
 * To do, Working, Waiting and the last week's Done. Drag a card to another
 * column, or open it and pick a status. Moving one to Waiting asks what on.
 */
export function BoardView(props: { root: Root; now: Date }) {
  const { lanes, counts } = board(props.root, props.now);
  const [dragging, setDragging] = useState<Dragging>(null);
  const [openCard, setOpenCard] = useState<string | null>(null);
  const [askWaitingOn, setAskWaitingOn] = useState<string | null>(null);
  const waitingCol = useHighlight('board-waiting');
  const lanesHl = useHighlight('board-lanes');

  return (
    <>
      <header class="mb-20">
        <BackLink />
        <h1 class="mt-10 text-heading leading-[1.2] tracking-[-0.015em]">Board</h1>
      </header>
      <BoardStrip counts={counts} now={props.now} />

      {lanes.length === 0 ? (
        <p class="rounded-14 border border-dashed border-line-strong px-20 py-18 text-15 text-body">
          No open projects with tasks yet. Add some on your tracker and they appear here, one lane each.
        </p>
      ) : (
        <div {...lanesHl.attrs} class={`relative rounded-14 border border-line bg-card shadow-card ${lanesHl.ring}`}>
          <HintTag text={lanesHl.hint} />
          <div class={`${GRID} sticky top-0 z-1 rounded-t-14 border-b border-line bg-page-55 max-md:hidden`} aria-hidden="true">
            <span class="px-16 py-10 text-12 font-medium text-body">Project</span>
            {COLUMNS.map((c) => (
              <span
                key={c.status}
                {...(c.status === 'waiting' ? waitingCol.attrs : {})}
                class={`relative border-l border-line px-12 py-10 text-12 font-medium text-body ${c.status === 'waiting' ? waitingCol.ring : ''}`}
              >
                {c.status === 'waiting' && <HintTag text={waitingCol.hint} />}
                {c.label}
              </span>
            ))}
          </div>
          {lanes.map((lane) => (
            <BoardLane
              key={lane.project.id}
              lane={lane}
              now={props.now}
              dragging={dragging}
              openCard={openCard}
              askWaitingOn={askWaitingOn}
              onDrag={setDragging}
              onOpenCard={(id) => {
                setOpenCard(id);
                setAskWaitingOn(null);
              }}
              onMoved={(task, status) => {
                // Moved to Waiting: open it and ask what on.
                if (status === 'waiting') {
                  setOpenCard(task.id);
                  setAskWaitingOn(task.id);
                }
              }}
            />
          ))}
        </div>
      )}
    </>
  );
}
