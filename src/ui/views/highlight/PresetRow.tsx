import type { ComponentChildren } from 'preact';
import { CheckIcon } from '../../components/icons';

/** A preset in the list: its name and a line about it; clicking it uses it. What it can do sits on the right. */
export function PresetRow(props: { name: string; sub?: string; selected: boolean; onUse: () => void; children?: ComponentChildren }) {
  return (
    <li class="flex min-h-48 items-center gap-6 px-22 max-md:px-16">
      <button
        type="button"
        class="group grid min-w-0 flex-1 cursor-pointer grid-cols-[16px_minmax(0,1fr)] items-center gap-x-8 bg-transparent py-6 text-left"
        aria-pressed={props.selected}
        onClick={props.onUse}
      >
        <span class="text-primary-ink">{props.selected && <CheckIcon size={14} />}</span>
        <span class="truncate text-14 font-medium text-ink group-hover:text-primary-ink">{props.name}</span>
        {props.sub && <span class="col-start-2 truncate text-12 text-body">{props.sub}</span>}
      </button>
      {props.children}
    </li>
  );
}
