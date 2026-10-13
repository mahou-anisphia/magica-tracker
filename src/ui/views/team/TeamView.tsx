import type { Root } from '../../../core/schema';
import type { Team } from '../../../core/team';
import type { TeamImportRow } from '../../store';
import { ViewHeader } from '../../components/ViewHeader';
import { AddMemberPanel } from './AddMemberPanel';
import { MembersPanel } from './MembersPanel';
import { TeamImportDialog } from './TeamImportDialog';

/** Team: the people you follow, added by hand, with the files they send you. */
export function TeamView(props: { root: Root; team: Team; teamImport: TeamImportRow[] | null; now: Date }) {
  return (
    <>
      <ViewHeader title="Team">
        The people you follow. Their data comes from files they export, and you only ever read it.
      </ViewHeader>
      <div class="grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] items-start gap-24 max-lg:grid-cols-1">
        <MembersPanel team={props.team} now={props.now} />
        <AddMemberPanel />
      </div>
      <TeamImportDialog rows={props.teamImport} team={props.team} mine={props.root} />
    </>
  );
}
