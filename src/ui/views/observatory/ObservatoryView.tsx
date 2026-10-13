import type { Root } from '../../../core/schema';
import type { Team } from '../../../core/team';
import { Panel } from '../../components/Panel';
import { ViewHeader } from '../../components/ViewHeader';
import { EscalationList } from './EscalationList';
import { PersonRow } from './PersonRow';
import { isPastLimit, people } from './people';

/**
 * The leader's view: everyone at once, from each person's latest file and
 * their own allocation settings. A first version, marked as a prototype.
 */
export function ObservatoryView(props: { root: Root; team: Team; now: Date }) {
  const all = people(props.root, props.team, props.now);
  const summary = [
    { label: 'People', value: all.length },
    { label: 'Past their limit', value: all.filter(isPastLimit).length },
    { label: 'May be escalated', value: all.reduce((n, p) => n + (p.data?.escalations.length ?? 0), 0) },
    { label: 'Blocked tasks', value: all.reduce((n, p) => n + (p.data?.stats.blocked ?? 0), 0) },
  ];

  return (
    <>
      <ViewHeader title="Observatory">
        Your team from above, from each person’s latest file and their own allocation settings.{' '}
        <span class="pill pill-low align-middle">Prototype</span>
      </ViewHeader>
      <dl class="mb-28 grid grid-cols-4 gap-12 max-md:grid-cols-2">
        {summary.map((s) => (
          <div key={s.label} class="grid grid-cols-1 gap-4 rounded-14 border border-line bg-card px-20 py-16 shadow-card">
            <dt class="text-13 font-medium text-body">{s.label}</dt>
            <dd class={`m-0 text-24 font-medium tabular-nums ${s.value ? 'text-ink' : 'text-body'}`}>{s.value}</dd>
          </div>
        ))}
      </dl>
      <div class="grid grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] items-start gap-24 max-lg:grid-cols-1">
        <Panel id="people-h" title="Everyone this period" highlight="obs-load" note="Each by their own period and limit.">
          <ul class="-mx-22 -mb-20 border-t border-line max-md:-mx-16">
            {all.map((p) => (
              <PersonRow key={p.key} person={p} />
            ))}
          </ul>
        </Panel>
        <EscalationList people={all} />
      </div>
    </>
  );
}
