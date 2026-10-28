import { useState } from 'preact/hooks';
import { plural } from '../../../core/format';
import type { CostCenter, Root } from '../../../core/schema';
import { addCostCenter, deleteCostCenter, saveCostCenter } from '../../actions';
import { PlusIcon, TrashIcon } from '../../components/icons';
import { Panel } from '../../components/Panel';

const FIELD =
  'min-h-34 w-full min-w-0 rounded-8 border border-line bg-card px-10 py-4 text-14 text-ink placeholder:text-faint focus:border-accent focus:outline-none max-lg:min-h-44 max-lg:text-16';

/** One cost center: its code and name, saved when you leave a field (blanking both is refused). */
function CostCenterRow(props: { costCenter: CostCenter; projects: number }) {
  const c = props.costCenter;
  const save = (patch: { code?: string; name?: string }) => {
    const next = { code: c.code ?? '', name: c.name ?? '', ...patch };
    if (next.code.trim() === (c.code ?? '') && next.name.trim() === (c.name ?? '')) return;
    saveCostCenter(c.id, next);
  };
  return (
    <li class="grid grid-cols-[120px_minmax(0,1fr)_auto] items-center gap-8 border-t border-line px-22 py-8 max-md:grid-cols-[96px_minmax(0,1fr)_auto] max-md:px-16">
      <input
        class={`${FIELD} tabular-nums`}
        aria-label="Code"
        placeholder="Code"
        value={c.code ?? ''}
        onBlur={(e) => save({ code: e.currentTarget.value })}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
      />
      <input
        class={FIELD}
        aria-label="Name"
        placeholder="Name"
        value={c.name ?? ''}
        onBlur={(e) => save({ name: e.currentTarget.value })}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
      />
      <span class="flex items-center gap-6">
        <span class="w-76 text-right text-12 text-body tabular-nums max-md:hidden">{plural(props.projects, 'project')}</span>
        <button type="button" class="icon-btn" aria-label={`Delete ${c.code ?? c.name}`} onClick={() => void deleteCostCenter(c)}>
          <TrashIcon />
        </button>
      </span>
    </li>
  );
}

/**
 * The cost centers timesheet days are charged to: each with a code, a name,
 * or both. Projects pick theirs in More details; one may have none.
 */
export function CostCentersCard(props: { root: Root }) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const centers = props.root.costCenters ?? [];
  const add = (e: Event) => {
    e.preventDefault();
    if (!addCostCenter({ code, name })) return;
    setCode('');
    setName('');
  };
  return (
    <Panel
      id="cost-centers-h"
      title="Cost centers"
      highlight="settings-costcenters"
      note="What timesheet days are charged to. A project picks one in More details, or has none; leave and holidays are never charged."
    >
      {centers.length > 0 && (
        <ul class="-mx-22 max-md:-mx-16">
          {centers.map((c) => (
            <CostCenterRow key={c.id} costCenter={c} projects={props.root.projects.filter((p) => p.costCenterId === c.id).length} />
          ))}
        </ul>
      )}
      <form class="grid grid-cols-[120px_minmax(0,1fr)_auto] items-center gap-8 max-md:grid-cols-[96px_minmax(0,1fr)_auto]" onSubmit={add}>
        <input class={`${FIELD} tabular-nums`} aria-label="New cost center’s code" placeholder="Code" value={code} onInput={(e) => setCode(e.currentTarget.value)} />
        <input class={FIELD} aria-label="New cost center’s name" placeholder="Name" value={name} onInput={(e) => setName(e.currentTarget.value)} />
        <button type="submit" class="btn btn-small" disabled={!code.trim() && !name.trim()}>
          <PlusIcon size={14} />
          Add
        </button>
      </form>
    </Panel>
  );
}
