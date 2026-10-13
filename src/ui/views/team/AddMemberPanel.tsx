import { useState } from 'preact/hooks';
import { addTeamMember } from '../../actions';
import { Panel } from '../../components/Panel';
import { FIELD } from './field';

/** Adds one person at a time. Their data comes later, from the file they export. */
export function AddMemberPanel() {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [taken, setTaken] = useState(false);
  const add = (e: Event) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (!addTeamMember(name, role)) {
      setTaken(true);
      return;
    }
    setName('');
    setRole('');
    setTaken(false);
  };

  return (
    <Panel id="add-member-h" title="Add a member" highlight="team-add">
      <form class="grid grid-cols-1 gap-14" onSubmit={add}>
        <label class="grid grid-cols-1 gap-5 text-12 font-medium text-body">
          Name
          <input
            type="text"
            class={FIELD}
            placeholder="Who are they?"
            value={name}
            aria-invalid={taken}
            aria-describedby={taken ? 'add-member-taken' : undefined}
            onInput={(e) => {
              setName(e.currentTarget.value);
              setTaken(false);
            }}
          />
        </label>
        {taken && (
          <p id="add-member-taken" class="-mt-6 text-12 text-watch-ink" role="alert">
            Someone in your team already has that name.
          </p>
        )}
        <label class="grid grid-cols-1 gap-5 text-12 font-medium text-body">
          <span>
            Role <span class="font-normal text-faint">optional</span>
          </span>
          <input
            type="text"
            class={FIELD}
            placeholder="What they look after"
            value={role}
            onInput={(e) => setRole(e.currentTarget.value)}
          />
        </label>
        <button type="submit" class="btn btn-primary justify-self-start" disabled={!name.trim()}>
          Add to team
        </button>
      </form>
      <p class="text-13 text-body">
        Then ask them to use Export and send you the file. Bring it in with Import their files.
      </p>
    </Panel>
  );
}
