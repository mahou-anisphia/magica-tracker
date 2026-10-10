import type { DueItem } from '../../../core/calendar';
import { itemTone, where } from './dueItem';

const TONE = {
  done: 'bg-page-70 font-normal text-faint',
  watch: 'bg-watch-tint font-medium text-watch-ink',
  open: 'bg-chip font-medium text-ink',
};

// A project's own deadline: led by the same dot the sidebar uses.
const PROJECT_DOT = "before:size-7 before:flex-none before:rounded-full before:bg-current before:content-['']";

/**
 * One deadline as a chip: small in a calendar cell, roomy in the phone agenda,
 * where the title wraps instead of being cut short.
 */
export function CalendarItem(props: { item: DueItem; agenda?: boolean; onClick: (e: MouseEvent) => void }) {
  const it = props.item;
  const size = props.agenda ? 'min-h-44 rounded-10 px-12 py-8 text-15' : 'rounded-7 px-8 py-3 text-13';
  return (
    <button
      type="button"
      class={`flex w-full min-w-0 cursor-pointer items-center gap-6 text-left hover:inset-ring hover:inset-ring-accent ${size} ${TONE[itemTone(it)]} ${it.task ? '' : PROJECT_DOT}`}
      title={props.agenda ? undefined : `${it.title} — ${where(it)}`}
      onClick={props.onClick}
    >
      <span class={`block min-w-0 overflow-hidden text-ellipsis ${props.agenda ? 'whitespace-normal' : 'whitespace-nowrap'}`}>
        {it.title}
      </span>
    </button>
  );
}
