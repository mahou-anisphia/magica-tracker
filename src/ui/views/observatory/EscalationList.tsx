import { shortDay } from '../../../core/format';
import { Panel } from '../../components/Panel';
import type { Person } from './people';

/** Every "I may be escalated" flag across the team, newest first. */
export function EscalationList(props: { people: Person[] }) {
  const flags = props.people
    .flatMap((p) => (p.data?.escalations ?? []).map((e) => ({ who: p.name, e })))
    .sort((a, b) => Date.parse(b.e.since) - Date.parse(a.e.since));
  return (
    <Panel id="escalations-h" title="May be escalated to you" highlight="obs-escalate" note="What people flagged themselves, so it doesn't reach you as a surprise.">
      {flags.length ? (
        <ul class="grid grid-cols-1 gap-10">
          {flags.map(({ who, e }) => (
            <li key={`${who}-${e.task.id}`} class="grid grid-cols-1 gap-2 rounded-12 border border-line bg-page-55 px-16 py-12">
              <span class="text-12 text-body">
                {who} · since {shortDay(e.since)} · {e.project.name}
              </span>
              <span class="font-medium text-ink">{e.task.title}</span>
              {(e.by || e.why) && (
                <span class="text-13 text-body">
                  {e.by ? `By ${e.by}` : ''}
                  {e.by && e.why ? ': ' : ''}
                  {e.why}
                </span>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p class="text-14 text-body">No one has flagged anything.</p>
      )}
    </Panel>
  );
}
