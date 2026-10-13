import { useState } from 'preact/hooks';
import type { Member, Team } from '../../../core/team';
import { viewAs } from '../../actions';
import { Avatar } from '../../components/Avatar';
import { EditMember } from './EditMember';
import { FilePill } from './FilePill';
import { ImportFilesButton } from './ImportFilesButton';

/** One person: who they are, how fresh their file is, and what you can do. */
export function MemberRow(props: { member: Member; team: Team; now: Date }) {
  const { member } = props;
  const [editing, setEditing] = useState(false);

  return (
    <li class="border-t border-line px-22 py-12 first:border-t-0 max-md:px-16">
      {editing ? (
        <EditMember member={member} team={props.team} onDone={() => setEditing(false)} />
      ) : (
        <div class="flex min-h-44 flex-wrap items-center gap-x-14 gap-y-8">
          <Avatar name={member.name} />
          <span class="grid min-w-0 flex-1 grid-cols-1">
            <span class="truncate font-medium text-ink">{member.name}</span>
            <span class="truncate text-13 text-body">{member.role ?? 'No role yet'}</span>
          </span>
          <FilePill member={member} now={props.now} />
          <span class="flex items-center gap-4 max-md:w-full max-md:justify-end">
            {member.snapshot ? (
              <button type="button" class="btn btn-quiet btn-small text-primary-ink" onClick={() => viewAs(member.id)}>
                View as {member.name}
              </button>
            ) : (
              <ImportFilesButton class="btn btn-quiet btn-small text-primary-ink" forMember={member.id}>
                Import their file
              </ImportFilesButton>
            )}
            <button type="button" class="btn btn-quiet btn-small" aria-label={`Edit ${member.name}`} onClick={() => setEditing(true)}>
              Edit
            </button>
          </span>
        </div>
      )}
    </li>
  );
}
