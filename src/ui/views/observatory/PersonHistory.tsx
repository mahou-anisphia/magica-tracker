import { plural, shortDay } from '../../../core/format';
import { rangeLabel } from '../../components/AllocationBar';
import { go } from '../../store';
import { LoadMeter } from './LoadMeter';
import type { Person } from './people';

/**
 * A person's earlier periods, opened from their row: one line each, newest
 * first, with its dates, how many tasks filled it and its bar against their
 * limit, under a sentence saying what it is and where it comes from.
 */
export function PersonHistory(props: { id: string; person: Person }) {
  const p = props.person;
  const d = p.data!;
  const { period, maxLoad } = d.allocation;
  const periods = [...d.history].reverse();
  const past = periods.filter((a) => a.total > maxLoad).length;
  const whose = p.member ? `${p.name}’s` : 'Your';
  const source = p.member?.snapshot ? ` From their file of ${shortDay(p.member.snapshot.exportedAt)}.` : '';

  return (
    <div id={props.id} class="col-span-full ml-50 grid grid-cols-1 gap-12 rounded-12 bg-page-55 px-16 py-14 max-lg:ml-0">
      <p class="text-13 text-body">
        {whose} allocation in each of the {plural(periods.length, period)} before this one, against {p.member ? 'their' : 'your'} {maxLoad}%
        limit{past ? `: past it in ${past} of them` : ''}.{source}
      </p>
      <ul class="grid grid-cols-1 gap-12">
        {periods.map((a) => (
          <li key={a.range.start}>
            <LoadMeter allocation={a} name={p.name} label={`${rangeLabel(a.range)} · ${plural(a.tasks, 'task')}`} />
          </li>
        ))}
      </ul>
      {!p.member && (
        <button
          type="button"
          class="cursor-pointer justify-self-start text-13 font-medium text-primary-ink hover:underline"
          onClick={() => go('allocation', { key: 'alloc-chart' })}
        >
          See what filled each one
        </button>
      )}
    </div>
  );
}
