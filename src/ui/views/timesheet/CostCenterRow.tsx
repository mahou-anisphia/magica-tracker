import { useState } from 'preact/hooks';
import { costCenterLabel } from '../../../core/costCenters';
import { plural } from '../../../core/format';
import type { CostCenter, Project } from '../../../core/schema';
import { deleteCostCenter, setProjectCostCenter } from '../../actions';
import { ChevronIcon } from '../../components/icons';
import { CostCenterForm } from './CostCenterForm';

/** A project under a cost center: its days charged there this month, or none yet (null). */
export type ChargedProject = { project: Project; days: number | null };

/**
 * One cost center (or, null, the days charged to none) with its days this
 * month. Open, it lists its projects, takes another one (from this month on),
 * and can be renamed or deleted.
 */
export function CostCenterRow(props: { costCenter: CostCenter | null; days: number; projects: ChargedProject[]; others: Project[] }) {
  const c = props.costCenter;
  const [open, setOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const id = `center-${c?.id ?? 'none'}`;

  if (renaming && c) {
    return (
      <li class="border-t border-line px-22 py-10 max-md:px-16">
        <CostCenterForm costCenter={c} onDone={() => setRenaming(false)} />
      </li>
    );
  }

  return (
    <li class="border-t border-line">
      <button
        type="button"
        class="group flex min-h-52 w-full cursor-pointer items-center gap-10 px-22 py-8 text-left hover:bg-page-70 max-md:px-16"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
      >
        <span class="inline-flex text-body transition-transform group-aria-expanded:rotate-180">
          <ChevronIcon dir="down" />
        </span>
        <span class="grid min-w-0 flex-1 grid-cols-1">
          <span class={`truncate font-medium ${c ? 'text-ink' : 'text-body'}`}>{c ? costCenterLabel(c) : 'No cost center'}</span>
          <span class="text-12 text-body">{plural(props.projects.length, 'project')}</span>
        </span>
        <span class={`text-14 tabular-nums ${props.days ? 'font-medium text-ink' : 'text-faint'}`}>{props.days ? plural(props.days, 'day') : '—'}</span>
      </button>
      {open && (
        <div id={id} class="grid grid-cols-1 gap-8 pr-22 pb-12 pl-48 max-md:pr-16">
          {props.projects.length > 0 && (
            <ul class="grid grid-cols-1 gap-4 text-14">
              {props.projects.map((x) => (
                <li key={x.project.id} class="flex justify-between gap-12">
                  <span class="truncate text-ink">{x.project.name}</span>
                  <span class="text-body tabular-nums">{x.days ? plural(x.days, 'day') : '—'}</span>
                </li>
              ))}
            </ul>
          )}
          {c && props.others.length > 0 && (
            <select
              class="min-h-32 cursor-pointer rounded-8 border border-dashed border-line-strong bg-transparent px-8 text-13 text-body hover:border-accent hover:text-primary-ink max-lg:min-h-44 max-lg:text-16"
              aria-label={`Charge another project to ${costCenterLabel(c)}`}
              value=""
              onChange={(e) => {
                const projectId = e.currentTarget.value;
                if (projectId) setProjectCostCenter(projectId, c.id);
              }}
            >
              <option value="">+ Add a project</option>
              {props.others.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
          {c && (
            <div class="flex gap-6">
              <button type="button" class="btn btn-quiet btn-small -ml-10" onClick={() => setRenaming(true)}>
                Rename
              </button>
              <button type="button" class="btn btn-quiet btn-small btn-danger" onClick={() => void deleteCostCenter(c)}>
                Delete
              </button>
            </div>
          )}
        </div>
      )}
    </li>
  );
}
