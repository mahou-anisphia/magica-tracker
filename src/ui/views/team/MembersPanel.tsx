import { plural } from '../../../core/format';
import type { Team } from '../../../core/team';
import { HintTag, useHighlight } from '../../components/highlight';
import { Panel } from '../../components/Panel';
import { ImportFilesButton } from './ImportFilesButton';
import { MemberRow } from './MemberRow';

/** "Import their files": the orb's Import action points here. */
function ImportButton() {
  const h = useHighlight('team-import');
  return (
    <span {...h.attrs} class={`relative rounded-10 ${h.ring}`}>
      <HintTag text={h.hint} />
      <ImportFilesButton class="btn btn-small">Import their files</ImportFilesButton>
    </span>
  );
}

/** Everyone you follow, with how fresh their file is. */
export function MembersPanel(props: { team: Team; now: Date }) {
  const { members } = props.team;
  return (
    <Panel
      id="members-h"
      title="Members"
      highlight="team-members"
      note={members.length ? plural(members.length, 'person', 'people') : undefined}
      aside={<ImportButton />}
    >
      {members.length ? (
        <ul class="-mx-22 -mb-20 border-t border-line max-md:-mx-16">
          {members.map((m) => (
            <MemberRow key={m.id} member={m} team={props.team} now={props.now} />
          ))}
        </ul>
      ) : (
        <p class="rounded-10 border border-dashed border-line-strong px-16 py-14 text-14 text-body">
          No one yet. Add people one at a time, then import the files they export.
        </p>
      )}
    </Panel>
  );
}
