import type { Task } from '../../../core/schema';

/** The look of a card, shared by the card and the copy that follows the pointer. */
export const CARD = 'rounded-10 border border-line bg-card px-12 py-10 text-left text-14 font-medium shadow-card';

/**
 * A task on the Board: its title, nothing more. Hold and drag to move it (a
 * long press on touch); click or tap to see the rest. While another card is
 * held it slides aside by `shift` pixels to make room or close a gap.
 */
export function BoardCard(props: {
  task: Task;
  /** Being held: its copy follows the pointer, its place stays empty. */
  held: boolean;
  shift: number;
  /** Cards take new places at once right after a drop. */
  animate: boolean;
  onPress: (e: PointerEvent) => void;
  onOpen: () => void;
}) {
  const { task } = props;
  return (
    <li
      data-card={task.id}
      class={`select-none [-webkit-touch-callout:none] ${props.animate ? 'transition-transform duration-200 ease-out' : ''} ${
        props.held ? 'opacity-0' : ''
      }`}
      style={props.shift ? { transform: `translateY(${props.shift}px)` } : undefined}
      onPointerDown={props.onPress}
      onContextMenu={(e) => e.preventDefault()}
    >
      <button
        type="button"
        class={`${CARD} w-full cursor-grab hover:border-accent-line active:cursor-grabbing max-lg:min-h-44 ${
          task.done ? 'text-faint line-through' : 'text-ink'
        }`}
        onClick={props.onOpen}
      >
        {task.title}
        {task.done && <span class="sr-only"> (done)</span>}
      </button>
    </li>
  );
}
