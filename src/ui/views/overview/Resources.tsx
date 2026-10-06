import { useState } from 'preact/hooks';
import { newId } from '../../../core/id';
import * as ops from '../../../core/ops';
import type { Resource } from '../../../core/schema';
import { shortUrl } from '../../../core/url';
import { CrossIcon, ExternalIcon, PencilIcon } from '../../components/icons';
import { update, updateWithUndo } from '../../store';
import { ADD_BORDER, ADD_FIELD } from './AddInput';
import { ResourceForm } from './ResourceForm';
import { RowAction, RowActions } from './RowActions';

/** Linked documents, then a dashed "+ Add a resource…" row that opens into a small form. */
export function Resources(props: { target: ops.ResourceTarget; resources: Resource[] }) {
  const { target, resources } = props;
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <div class="grid grid-cols-1 gap-8">
      {resources.length > 0 && (
        <ul class="grid grid-cols-1 overflow-hidden rounded-14 border border-line bg-card [&>li+li]:border-t [&>li+li]:border-line">
          {resources.map((r) =>
            editingId === r.id ? (
              <li key={r.id}>
                <ResourceForm
                  initial={r}
                  onSubmit={(input) => {
                    update((root, now) => ops.updateResource(root, target, r.id, input, now));
                    setEditingId(null);
                  }}
                  onClose={() => setEditingId(null)}
                />
              </li>
            ) : (
              <li key={r.id} class="flex items-start gap-12 py-12 pr-14 pl-18">
                <span class="mt-[0.5em] size-8 flex-none rounded-2 bg-iris" aria-hidden="true" />
                <div class="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-10">
                  <a
                    class="inline-flex items-center gap-6 font-medium text-deep no-underline hover:text-iris-deep hover:underline [&_svg]:flex-none [&_svg]:text-steel"
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {r.header}
                    <ExternalIcon />
                    <span class="sr-only"> (opens in a new tab)</span>
                  </a>
                  <span class="text-13 text-slate">{shortUrl(r.url)}</span>
                  {r.note && <span class="basis-full text-13 text-slate">{r.note}</span>}
                </div>
                <RowActions>
                  <RowAction label={`Edit ${r.header}`} title="Edit" onClick={() => setEditingId(r.id)}>
                    <PencilIcon />
                  </RowAction>
                  <RowAction
                    label={`Remove ${r.header}`}
                    title="Remove"
                    onClick={() =>
                      updateWithUndo(`Removed “${r.header}”`, (root, now) => ops.deleteResource(root, target, r.id, now))
                    }
                  >
                    <CrossIcon />
                  </RowAction>
                </RowActions>
              </li>
            ),
          )}
        </ul>
      )}

      {adding ? (
        <ResourceForm
          onSubmit={(input) => {
            const id = newId();
            update((root, now) => ops.addResource(root, target, id, input, now));
          }}
          onClose={() => setAdding(false)}
        />
      ) : (
        <button
          type="button"
          class={`${ADD_FIELD} ${ADD_BORDER} min-h-[calc(var(--tap)+8px)] w-full cursor-pointer text-left text-slate hover:border-iris hover:text-iris-deep`}
          onClick={() => setAdding(true)}
        >
          <span class="text-[1.05rem] leading-none text-slate" aria-hidden="true">
            +
          </span>
          Add a resource…
        </button>
      )}
    </div>
  );
}
