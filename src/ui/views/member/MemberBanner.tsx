import { shortDay } from '../../../core/format';
import type { Member } from '../../../core/team';
import { go } from '../../store';

/** Says whose tracker this is, how old the file is, and that nothing here changes. */
export function MemberBanner(props: { member: Member }) {
  const { member } = props;
  return (
    <div role="status" class="mb-28 flex flex-wrap items-center gap-x-12 gap-y-8 rounded-14 bg-primary-tint px-18 py-12 text-14 text-ink">
      <span class="min-w-0 flex-1 max-md:basis-full">
        <strong class="font-semibold">Viewing as {member.name}.</strong> Their file from{' '}
        {shortDay(member.snapshot!.exportedAt)}. Read-only: nothing here can be changed.
      </span>
      <span class="pill pill-low">Prototype</span>
      <button type="button" class="btn btn-small" onClick={() => go('team')}>
        Back to Team
      </button>
    </div>
  );
}
