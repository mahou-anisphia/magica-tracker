import * as ops from '../../../core/ops';
import type { Domain } from '../../../core/schema';
import { deleteDomain } from '../../actions';
import { PencilIcon, TrashIcon } from '../../components/icons';
import { update } from '../../store';
import { InlineInput } from './InlineInput';

/**
 * A domain's name over its projects in the sidebar, or Uncategorized (no
 * domain). It is a drop point too: a project dropped on it goes first in the
 * group. Double-click the name, or the pencil, to rename it; the bin deletes
 * it (with undo), leaving its projects uncategorized.
 */
export function DomainHeading(props: { domain: Domain | null; naming: boolean; onNaming: (on: boolean) => void }) {
  const d = props.domain;
  const attrs = { 'data-group-head': '', 'data-domain': d?.id ?? '' };
  if (!d) {
    return (
      <div {...attrs} class="flex min-h-30 items-center px-12">
        <h3 class="truncate text-12 font-medium text-body">Uncategorized</h3>
      </div>
    );
  }
  if (props.naming) {
    return (
      <div {...attrs} class="px-12 pt-2">
        <InlineInput
          value={d.name}
          label="Domain name"
          class="text-13 font-medium text-ink"
          onSave={(name) => {
            update((r, n) => ops.renameDomain(r, d.id, name, n));
            props.onNaming(false);
          }}
          onCancel={() => props.onNaming(false)}
        />
      </div>
    );
  }
  return (
    <div {...attrs} class="group/head flex min-h-30 items-center gap-2 pl-12">
      <h3 class="min-w-0 flex-1 truncate text-12 font-medium text-body" title={`${d.name} (double-click to rename)`} onDblClick={() => props.onNaming(true)}>
        {d.name}
      </h3>
      <span class="flex opacity-0 transition-opacity group-hover/head:opacity-100 focus-within:opacity-100 max-lg:opacity-100">
        <button type="button" class="icon-btn" aria-label={`Rename the domain ${d.name}`} onClick={() => props.onNaming(true)}>
          <PencilIcon size={12} />
        </button>
        <button type="button" class="icon-btn" aria-label={`Delete the domain ${d.name}`} onClick={() => deleteDomain(d)}>
          <TrashIcon size={12} />
        </button>
      </span>
    </div>
  );
}
