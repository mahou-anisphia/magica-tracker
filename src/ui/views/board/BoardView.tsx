import { useState } from 'preact/hooks';
import { board } from '../../../core/board';
import { byDomain } from '../../../core/domains';
import { dayHeading } from '../../../core/format';
import type { Root } from '../../../core/schema';
import { localDateStamp } from '../../../core/time';
import { plural } from '../../../core/format';
import { placeTask } from '../../actions';
import { HintTag, useHighlight } from '../../components/highlight';
import { LabelledBlock } from '../../components/LabelledBlock';
import { ViewHeader } from '../../components/ViewHeader';
import { BoardGhost } from './BoardGhost';
import { BoardGlance } from './BoardGlance';
import { BoardLanes } from './BoardLanes';
import { BoardTaskDialog } from './BoardTaskDialog';
import { COLUMNS, GRID } from './columns';
import { useBoardDrag } from './useBoardDrag';

/**
 * The Board, from the orb: every active project as a lane, its tasks in
 * To do, Working, Waiting and the last week's Done. Cards are titles only;
 * drag one to move it, within or across its lane's columns, and click it for
 * the rest. Dropping one in Waiting opens it to say what on. With domains,
 * the lanes are grouped under them.
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
  // With domains, lanes sit under their domain's name, the ones in none last.
  const groups = byDomain(props.root, lanes, (l) => l.project);
  const grouped = groups.length > 1 || groups[0]?.domain !== null;
  const openTask = (projectId: string, taskId: string) => {
    if (!suppressClick.current) setOpenCard({ projectId, taskId });
  };
  const project = openCard ? props.root.projects.find((p) => p.id === openCard.projectId) : undefined;

  return (
    <>
      <ViewHeader title="Board">
        <time dateTime={localDateStamp(props.now)}>{dayHeading(props.now)}</time>
      </ViewHeader>
      <BoardGlance counts={counts} />

      <LabelledBlock id="board-lanes-h" title={grouped ? 'By domain and project' : 'By project'}>
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
            {grouped ? (
              groups.map((g) => (
                <section key={g.domain?.id ?? 'none'} aria-label={g.domain?.name ?? 'No domain'}>
                  <h3 class="flex items-baseline gap-10 border-t border-line bg-page-40 px-16 py-8 text-13 font-semibold text-ink">
                    {g.domain?.name ?? 'No domain'}
                    <span class="text-12 font-normal text-body">{plural(g.items.length, 'project')}</span>
                  </h3>
                  <BoardLanes
                    list={`board-lanes:${g.domain?.id ?? 'none'}`}
                    lanes={g.items}
                    drag={drag}
                    settling={settling}
                    onPress={press}
                    onOpen={openTask}
                  />
                </section>
              ))
            ) : (
              <BoardLanes list="board-lanes" lanes={lanes} drag={drag} settling={settling} onPress={press} onOpen={openTask} />
            )}
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
