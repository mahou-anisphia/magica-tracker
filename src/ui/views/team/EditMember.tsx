import { useState } from 'preact/hooks';
import { memberNamed, type Member, type Team } from '../../../core/team';
import { removeTeamMember, updateTeamMember } from '../../actions';
import { FIELD } from './field';

/** Renaming a member, changing their role, or removing them. */
export function EditMember(props: { member: Member; team: Team; onDone: () => void }) {
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
