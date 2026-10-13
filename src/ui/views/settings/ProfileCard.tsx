import { newId } from '../../../core/id';
import * as ops from '../../../core/ops';
import type { Root } from '../../../core/schema';
import { update } from '../../store';
import { Panel } from '../../components/Panel';

/** Your name on your exports, so a team leader can match your file to you. */
export function ProfileCard(props: { root: Root }) {
  const save = (name: string) => {
    if (name.trim() === (props.root.owner?.name ?? '')) return;
    update((r, n) => ops.setOwnerName(r, name, newId, n));
  };
  return (
    <Panel id="profile-h" title="Profile" highlight="settings-profile">
      <label class="grid grid-cols-1 gap-5 text-12 font-medium text-body">
        Your name
        <input
          type="text"
          class="min-h-38 rounded-10 border border-line bg-card px-12 py-4 text-15 font-normal text-ink placeholder:text-faint focus:border-accent focus:ring-3 focus:ring-accent/18 focus:outline-none max-lg:text-16"
          placeholder="Shown on your exports"
          value={props.root.owner?.name ?? ''}
          autoComplete="name"
          onBlur={(e) => save(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save(e.currentTarget.value);
          }}
        />
      </label>
      <p class="text-12 text-body">Your team uses it to match the file you send them to you.</p>
    </Panel>
  );
}
