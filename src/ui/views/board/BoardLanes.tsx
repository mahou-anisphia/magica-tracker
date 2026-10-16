import type { BoardLane as Lane } from '../../../core/board';
import { reorderProjects } from '../../actions';
import { useReorder } from '../../components/useReorder';
import { BoardLane } from './BoardLane';
import type { DragSource, DragState } from './useBoardDrag';

/**
 * Some lanes, one after another, that can be dragged by their names into a
 * new order among themselves: all of them, or one domain's (`list` names
 * the list for the drag).
 */
export function BoardLanes(props: {
  list: string;
  lanes: Lane[];
  drag: DragState | null;
  settling: boolean;
  onPress: (e: PointerEvent, source: DragSource) => void;
  onOpen: (projectId: string, taskId: string) => void;
}) {
  const order = useReorder({ list: props.list, ids: props.lanes.map((l) => l.project.id), onReorder: reorderProjects });
  return (
    <div data-reorder-list={props.list}>
      {props.lanes.map((lane) => (
        <BoardLane
          key={lane.project.id}
          lane={lane}
          drag={props.drag}
          settling={props.settling}
          onPress={props.onPress}
          onOpen={(taskId) => props.onOpen(lane.project.id, taskId)}
          shift={order.offset(lane.project.id)}
          held={order.held === lane.project.id}
          laneSettling={order.settling}
          onLanePress={(e) => order.press(e, lane.project.id)}
          laneClickBlocked={() => order.suppressClick.current}
        />
      ))}
    </div>
  );
}
