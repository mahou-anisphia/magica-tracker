import type { DueItem } from '../../core/calendar';
import { itemTone, where } from './dueItem';

const TONE = {
  urgent: 'bg-primary font-semibold text-on-primary inset-ring inset-ring-primary-strong',
  done: 'bg-page-70 font-normal text-faint',
  watch: 'bg-watch-tint font-medium text-watch-ink',
  open: 'bg-chip font-medium text-ink',
};

// An event (a task with no project) is outlined, so it reads apart from deadlines.
const EVENT_TONE = {
  urgent: TONE.urgent,
  done: 'bg-page-70 font-normal text-faint inset-ring inset-ring-line',
  watch: 'bg-watch-tint font-medium text-watch-ink inset-ring inset-ring-watch-mark',
  open: 'bg-card font-medium text-ink inset-ring inset-ring-line-strong',
};

// A project's own deadline: led by the same dot the sidebar uses.
const PROJECT_DOT = "before:size-7 before:flex-none before:rounded-full before:bg-current before:content-['']";

/**
 * One deadline or event as a chip: small in a calendar cell, roomy in the
 * phone agenda, where the title wraps instead of being cut short. An event
 * leads with its time.
 */
export function CalendarItem(props: { item: DueItem; agenda?: boolean; onClick: (e: MouseEvent) => void }) {
  const it = props.item;
  const size = props.agenda ? 'min-h-44 rounded-10 px-12 py-8 text-15' : 'rounded-7 px-8 py-3 text-13';
  const tone = it.kind === 'event' ? EVENT_TONE[itemTone(it)] : `${TONE[itemTone(it)]} ${it.task ? '' : PROJECT_DOT}`;
  const time = it.kind === 'event' ? it.entry.time : undefined;
  return (
    <button
      type="button"
      class={`flex w-full min-w-0 cursor-pointer items-center gap-6 text-left hover:inset-ring hover:inset-ring-accent ${size} ${tone}`}
      title={props.agenda ? undefined : `${it.title} — ${where(it)}`}
      onClick={props.onClick}
    >
      {time && <span class="flex-none tabular-nums opacity-80">{time}</span>}
      <span class={`block min-w-0 overflow-hidden text-ellipsis ${props.agenda ? 'whitespace-normal' : 'whitespace-nowrap'}`}>
        {it.title}
      </span>
      {it.urgent && it.watch && (
        <span class="size-7 flex-none rounded-full bg-watch-mark" title="Due soon">
          <span class="sr-only">, due soon</span>
        </span>
      )}
    </button>
  );
}
