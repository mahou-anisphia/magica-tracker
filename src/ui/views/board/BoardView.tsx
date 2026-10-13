import { useState } from 'preact/hooks';
import { board } from '../../../core/board';
import { dayHeading } from '../../../core/format';
import type { Root } from '../../../core/schema';
import { localDateStamp } from '../../../core/time';
import { placeTask, reorderProjects } from '../../actions';
import { HintTag, useHighlight } from '../../components/highlight';
import { LabelledBlock } from '../../components/LabelledBlock';
import { useReorder } from '../../components/useReorder';
import { ViewHeader } from '../../components/ViewHeader';
import { BoardGhost } from './BoardGhost';
import { BoardGlance } from './BoardGlance';
import { BoardLane } from './BoardLane';
import { BoardTaskDialog } from './BoardTaskDialog';
import { COLUMNS, GRID } from './columns';
import { useBoardDrag } from './useBoardDrag';

/**
 * The Board, from the orb: every active project as a lane, its tasks in
 * To do, Working, Waiting and the last week's Done. Cards are titles only;
 * drag one to move it, within or across its lane's columns, and click it for
 * the rest. Dropping one in Waiting opens it to say what on.
 */
export function BoardView(props: { root: Root; now: Date }) {
  const { lanes, counts } = board(props.root, props.now);
  const [openCard, setOpenCard] = useState<{ projectId: string; taskId: string; askWaitingOn?: boolean } | null>(null);
  const waitingCol = useHighlight('board-waiting');
  const lanesHl = useHighlight('board-lanes');
  const { drag, settling, press, suppressClick } = useBoardDrag({
    onDrop: (d, target) => {
      const project = props.root.projects.find((p) => p.id === d.projectId);
      const task = project?.tasks.find((t) => t.id === d.taskId);
      const lane = lanes.find((l) => l.project.id === d.projectId);
      if (!task || !lane) return;
      const others = lane.cells[target.status].filter((t) => t.id !== d.taskId);
      const before = target.status === 'done' ? null : (others[target.index]?.id ?? null);
      void placeTask(d.projectId, task, target.status, before).then(() => {
        if (target.status === 'waiting' && d.from !== 'waiting') setOpenCard({ projectId: d.projectId, taskId: d.taskId, askWaitingOn: true });
      });
    },
  });
  const lanesOrder = useReorder({ list: 'board-lanes', ids: lanes.map((l) => l.project.id), onReorder: reorderProjects });
  const project = openCard ? props.root.projects.find((p) => p.id === openCard.projectId) : undefined;

  return (
    <>
      <ViewHeader title="Board">
        <time dateTime={localDateStamp(props.now)}>{dayHeading(props.now)}</time>
      </ViewHeader>
      <BoardGlance counts={counts} />

      <LabelledBlock id="board-lanes-h" title="By project">
        {lanes.length === 0 ? (
          <p class="rounded-14 border border-dashed border-line-strong px-20 py-18 text-15 text-body">
            No open projects with tasks yet. Add some on your tracker and they appear here, one lane each.
          </p>
        ) : (
          <div {...lanesHl.attrs} data-reorder-list="board-lanes" class={`relative rounded-14 border border-line bg-card shadow-card ${lanesHl.ring}`}>
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
                drag={drag}
                settling={settling}
                onPress={press}
                onOpen={(taskId) => {
                  if (!suppressClick.current) setOpenCard({ projectId: lane.project.id, taskId });
                }}
                shift={lanesOrder.offset(lane.project.id)}
                held={lanesOrder.held === lane.project.id}
                laneSettling={lanesOrder.settling}
                onLanePress={(e) => lanesOrder.press(e, lane.project.id)}
                laneClickBlocked={() => lanesOrder.suppressClick.current}
              />
            ))}
          </div>
        )}
      </LabelledBlock>

      {drag && <BoardGhost drag={drag} />}
      <BoardTaskDialog
        project={project}
        task={project?.tasks.find((t) => t.id === openCard?.taskId)}
        now={props.now}
        askWaitingOn={!!openCard?.askWaitingOn}
        onClose={() => setOpenCard(null)}
      />
    </>
  );
}
