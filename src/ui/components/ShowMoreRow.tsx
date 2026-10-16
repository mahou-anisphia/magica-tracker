import { ROW } from './ListRow';

/** The "Show N more" / "Show less" row under a list of ListRows. */
export function ShowMoreRow(props: { more: number; expanded: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      class={`${ROW} min-h-46 cursor-pointer justify-center gap-14 px-20 py-12 text-14 font-medium text-primary-ink hover:bg-page-70`}
      aria-expanded={props.expanded}
      onClick={props.onToggle}
    >
      {props.expanded ? 'Show less' : `Show ${props.more} more`}
    </button>
  );
}
