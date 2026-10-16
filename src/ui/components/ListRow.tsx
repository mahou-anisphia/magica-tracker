import type { ComponentChildren } from 'preact';

/** The mark at the start of a row: what kind of thing it is, at a glance. */
export type RowTone = 'watch' | 'waiting' | 'urgent' | 'working' | 'plain';

const DOT: Record<RowTone, string> = {
  watch: 'rounded-full border-watch bg-watch',
  waiting: 'rounded-2 border-ink bg-ink',
  urgent: 'rounded-full border-primary-strong bg-primary-strong',
  working: 'rounded-full border-primary-strong bg-transparent',
  plain: 'rounded-full border-line-strong bg-transparent',
};

/** The row's layout, shared with ShowMoreRow. */
export const ROW = 'flex w-full items-center bg-transparent text-left';

/**
 * One item in a card's list (Needs attention, an At a glance list): a mark,
 * its title over a line of context, and pills on the right. With `onOpen` the
 * whole row is a button; without it (someone else's data) it is plain text.
 * Put it in an `li`.
 */
export function ListRow(props: { tone: RowTone; title: string; sub: string; onOpen?: () => void; children?: ComponentChildren }) {
  const body = (
    <>
      <span class={`size-8 flex-none border-[1.5px] ${DOT[props.tone]}`} aria-hidden="true" />
      <span class="grid min-w-0 flex-1 grid-cols-1 gap-1">
        <span class={`truncate font-medium text-ink ${props.onOpen ? 'group-hover:text-primary-ink' : ''}`} title={props.title}>
          {props.title}
        </span>
        <span class="truncate text-13 text-body" title={props.sub}>
          {props.sub}
        </span>
      </span>
      {props.children}
    </>
  );
  const box = 'min-h-64 gap-14 px-20 py-12';
  return props.onOpen ? (
    <button type="button" class={`group ${ROW} cursor-pointer hover:bg-page-70 ${box}`} onClick={props.onOpen}>
      {body}
    </button>
  ) : (
    <div class={`${ROW} ${box}`}>{body}</div>
  );
}
