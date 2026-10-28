import { plural } from '../../../core/format';
import type { MonthBalance } from '../../../core/workdays';
import { startAddingEntry } from '../../actions';
import { ENTRY_NOUN, entrySpan } from '../../components/dueItem';
import { Panel } from '../../components/Panel';

/** The month's leave and holidays, from the Timeline, with the working days each takes. */
export function DaysOff(props: { balance: MonthBalance; addOn: string }) {
  const { off } = props.balance;
  return (
    <Panel id="timelog-off-h" title="Days off" highlight="timelog-off" note="From the Timeline. Weekends don’t count.">
      {off.length > 0 ? (
        <ul class="-mx-22 max-md:-mx-16">
          {off.map(({ entry, days }) => (
            <li key={entry.id} class="flex min-h-52 items-center gap-12 border-t border-line px-22 py-8 max-md:px-16">
              <span class="grid min-w-0 flex-1 grid-cols-1">
                <span class="truncate font-medium text-ink">{entry.title}</span>
                <span class="truncate text-13 text-body">
                  {ENTRY_NOUN[entry.kind]} · {entrySpan(entry)}
                </span>
              </span>
              <span class="pill bg-card bg-off text-ink inset-ring inset-ring-line">{plural(days, 'day')}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p class="text-14 text-body">No leave or holidays this month.</p>
      )}
      <button type="button" class="btn btn-quiet btn-small justify-self-start text-primary-ink" onClick={() => startAddingEntry(props.addOn)}>
        Add on the Timeline
      </button>
    </Panel>
  );
}
