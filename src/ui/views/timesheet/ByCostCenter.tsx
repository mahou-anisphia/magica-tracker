import { useState } from 'preact/hooks';
import { chargesIn, costCenterLabel } from '../../../core/costCenters';
import { plural } from '../../../core/format';
import type { Root } from '../../../core/schema';
import type { MonthBalance } from '../../../core/workdays';
import { ChevronIcon } from '../../components/icons';
import { Panel } from '../../components/Panel';

/**
 * What the month charges to each cost center, most days first, then days
 * charged to none; each opens to the projects behind it. Leave and holidays
 * aren't charged, and say so at the foot.
 */
export function ByCostCenter(props: { root: Root; balance: MonthBalance }) {
  const { month, leave, holiday } = props.balance;
  const [open, setOpen] = useState<Set<string>>(new Set());
  const charges = chargesIn(props.root, month);
  const off = leave + holiday;
  const toggle = (key: string) => {
    const next = new Set(open);
    if (!next.delete(key)) next.add(key);
    setOpen(next);
  };

  return (
    <Panel id="timelog-centers-h" title="By cost center" highlight="timelog-centers" note="Where the month’s days are charged.">
      {charges.length > 0 ? (
        <ul class="-mx-22 max-md:-mx-16">
          {charges.map((c) => {
            const key = c.costCenter?.id ?? 'none';
            const shown = open.has(key);
            const id = `charge-${key}`;
            return (
              <li key={key} class="border-t border-line">
                <button
                  type="button"
                  class="group flex min-h-52 w-full cursor-pointer items-center gap-10 px-22 py-8 text-left hover:bg-page-70 max-md:px-16"
                  aria-expanded={shown}
                  aria-controls={id}
                  onClick={() => toggle(key)}
                >
                  <span class="inline-flex text-body transition-transform group-aria-expanded:rotate-180">
                    <ChevronIcon dir="down" />
                  </span>
                  <span class="grid min-w-0 flex-1 grid-cols-1">
                    <span class={`truncate font-medium ${c.costCenter ? 'text-ink' : 'text-body'}`}>
                      {c.costCenter ? costCenterLabel(c.costCenter) : 'No cost center'}
                    </span>
                    <span class="text-12 text-body">{plural(c.projects.length, 'project')}</span>
                  </span>
                  <span class="text-14 font-medium text-ink tabular-nums">{plural(c.days, 'day')}</span>
                </button>
                {shown && (
                  <ul id={id} class="pb-8">
                    {c.projects.map((x) => (
                      <li key={x.project.id} class="flex justify-between gap-12 py-4 pr-22 pl-48 text-14 max-md:pr-16">
                        <span class="truncate text-ink">{x.project.name}</span>
                        <span class="text-body tabular-nums">{plural(x.days, 'day')}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p class="text-14 text-body">No days given to projects this month.</p>
      )}
      {off > 0 && (
        <p class="flex items-center gap-8 text-13 text-body">
          <span class="pill bg-card bg-off text-ink inset-ring inset-ring-line">{plural(off, 'day')}</span>
          Leave and holidays, not charged
        </p>
      )}
    </Panel>
  );
}
