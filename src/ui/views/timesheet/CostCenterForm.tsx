import { useState } from 'preact/hooks';
import type { CostCenter } from '../../../core/schema';
import { addCostCenter, saveCostCenter } from '../../actions';

const FIELD =
  'min-h-34 w-full min-w-0 rounded-8 border border-line bg-card px-10 py-4 text-14 text-ink placeholder:text-faint focus:border-accent focus:outline-none max-lg:min-h-44 max-lg:text-16';

/** A cost center's code and name: a new one, or (with `costCenter`) renaming one. Either field will do; Add waits for one. */
export function CostCenterForm(props: { costCenter?: CostCenter; onDone: () => void }) {
  const c = props.costCenter;
  const [code, setCode] = useState(c?.code ?? '');
  const [name, setName] = useState(c?.name ?? '');
  const empty = !code.trim() && !name.trim();
  const submit = (e: Event) => {
    e.preventDefault();
    if (empty) return;
    if (c) saveCostCenter(c.id, { code, name });
    else addCostCenter({ code, name });
    props.onDone();
  };
  return (
    <form
      class="grid grid-cols-[96px_minmax(0,1fr)] gap-8 rounded-12 border border-accent-line bg-card p-12"
      onSubmit={submit}
      onKeyDown={(e) => {
        if (e.key !== 'Escape') return;
        e.preventDefault();
        props.onDone();
      }}
    >
      <input
        class={`${FIELD} tabular-nums`}
        aria-label="Code"
        placeholder="Code"
        value={code}
        autoFocus
        onInput={(e) => setCode(e.currentTarget.value)}
      />
      <input class={FIELD} aria-label="Name" placeholder="Name" value={name} onInput={(e) => setName(e.currentTarget.value)} />
      <div class="col-span-2 flex items-center justify-end gap-6">
        <button type="button" class="btn btn-quiet btn-small" onClick={props.onDone}>
          Cancel
        </button>
        <button type="submit" class="btn btn-primary btn-small" disabled={empty}>
          {c ? 'Save' : 'Add'}
        </button>
      </div>
    </form>
  );
}
