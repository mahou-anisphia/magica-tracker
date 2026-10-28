import { monthName } from '../../../core/format';
import { balanceLabel, monthBalance } from '../../../core/workdays';
import type { Root } from '../../../core/schema';
import { Panel } from '../../components/Panel';

/**
 * Every month before this one since tracking started, newest first, and
 * whether it adds up. Picking one shows it above.
 */
export function EarlierMonths(props: { root: Root; months: string[]; shown: string; since: string; onPick: (month: string) => void }) {
  return (
    <Panel id="timelog-earlier-h" title="Earlier months" highlight="timelog-earlier" note={`Tracking since ${props.since}.`}>
      {props.months.length > 0 ? (
        <ul class="-mx-22 max-md:-mx-16">
          {props.months.map((m) => {
            const b = monthBalance(props.root, m);
            return (
              <li key={m} class="border-t border-line">
                <button
                  type="button"
                  class="flex min-h-52 w-full cursor-pointer items-center gap-12 px-22 py-8 text-left hover:bg-page-70 aria-[current=true]:bg-primary-tint-45 max-md:px-16"
                  aria-current={m === props.shown}
                  onClick={() => props.onPick(m)}
                >
                  <span class="grid min-w-0 flex-1 grid-cols-1">
                    <span class="font-medium text-ink">{monthName(m, true)}</span>
                    <span class="text-13 text-body tabular-nums">
                      {b.filled} of {b.target}
                    </span>
                  </span>
                  <span class={`pill ${b.diff ? 'pill-watch' : 'pill-plain'}`}>{balanceLabel(b.diff)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p class="text-14 text-body">This is the first month.</p>
      )}
    </Panel>
  );
}
