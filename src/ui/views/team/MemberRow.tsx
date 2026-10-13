import { useState } from 'preact/hooks';
import { shortDay } from '../../../core/format';
import { FILE_STALE_DAYS, fileAgeDays, memberNamed, type Member, type Team } from '../../../core/team';
import { removeTeamMember, updateTeamMember, viewAs } from '../../actions';
import { Avatar } from '../../components/Avatar';
import { FIELD } from './field';
import { ImportFilesButton } from './ImportFilesButton';

/** "File from 12 Oct", amber once it is getting old, dashed when there is none. */
function FilePill(props: { member: Member; now: Date }) {
  const snap = props.member.snapshot;
  if (!snap) return <span class="pill pill-low">No file yet</span>;
  const age = fileAgeDays(props.member, props.now)!;
  const label = `File from ${shortDay(snap.exportedAt)}`;
  return age > FILE_STALE_DAYS ? (
    <span class="pill pill-watch">
      {label} · {age} days old
    </span>
  ) : (
    <span class="pill pill-high">{label}</span>
  );
}

function EditMember(props: { member: Member; team: Team; onDone: () => void }) {
  const [name, setName] = useState(props.member.name);
  const [role, setRole] = useState(props.member.role ?? '');
  const taken = !!memberNamed(props.team, name, props.member.id);
  const save = (e: Event) => {
    e.preventDefault();
    if (!name.trim() || taken) return;
    updateTeamMember(props.member.id, { name, role });
    props.onDone();
  };
  return (
    <form class="grid grid-cols-[1fr_1fr_auto] items-end gap-10 max-md:grid-cols-1" onSubmit={save}>
      <label class="grid grid-cols-1 gap-5 text-12 font-medium text-body">
        Name
        <input type="text" class={FIELD} value={name} autoFocus onInput={(e) => setName(e.currentTarget.value)} aria-invalid={taken} />
      </label>
      <label class="grid grid-cols-1 gap-5 text-12 font-medium text-body">
        Role
        <input type="text" class={FIELD} value={role} placeholder="What they look after" onInput={(e) => setRole(e.currentTarget.value)} />
      </label>
      <div class="flex gap-6">
        <button type="submit" class="btn btn-primary btn-small" disabled={!name.trim() || taken}>
          Save
        </button>
        <button type="button" class="btn btn-quiet btn-small" onClick={props.onDone}>
          Cancel
        </button>
      </div>
      {taken && (
        <p class="col-span-full text-12 text-watch-ink" role="alert">
          Someone in your team already has that name.
        </p>
      )}
      <button
        type="button"
        class="btn btn-danger btn-small col-span-full justify-self-start"
        onClick={() => void removeTeamMember(props.member)}
      >
        Remove from team
      </button>
    </form>
  );
}

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
