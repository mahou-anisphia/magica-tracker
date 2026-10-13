import type { ComponentChildren } from 'preact';
import { useId, useState } from 'preact/hooks';

/**
 * A fold for the fields most tasks don't need. Closed, its header still names
 * what's set ("May be escalated · Definition of done"), so nothing important hides.
 */
export function MoreDetails(props: { summary: string[]; children: ComponentChildren }) {
  const [open, setOpen] = useState(false);
  const id = `more-${useId()}`;
  return (
    <div class="border-t border-line pt-8">
      <button
        type="button"
        class="flex min-h-(--tap) w-full cursor-pointer items-center gap-8 bg-transparent px-4 text-left text-14 font-medium text-ink before:text-[0.8rem] before:text-body before:transition-transform before:content-['▸'] aria-expanded:before:rotate-90"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
      >
        More details
        {!open && props.summary.length > 0 && (
          <span class="min-w-0 truncate text-13 font-normal text-body">{props.summary.join(' · ')}</span>
        )}
      </button>
      {open && (
        <div id={id} class="grid grid-cols-1 gap-12 pt-10 pr-4 pb-2 pl-22 max-lg:pl-4">
          {props.children}
        </div>
      )}
    </div>
  );
}
