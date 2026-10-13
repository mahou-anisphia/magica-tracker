import { dayHeading } from '../../../core/format';
import type { Member } from '../../../core/team';
import { MemberBanner } from './MemberBanner';
import { MemberGlance } from './MemberGlance';
import { MemberProjects } from './MemberProjects';

/**
 * "View as": someone's tracker from their latest file, read-only. A first
 * version: their numbers, allocation and active projects.
 */
export function MemberView(props: { member: Member; now: Date }) {
  const { member, now } = props;
  const root = member.snapshot!.root;
  return (
    <>
      <MemberBanner member={member} />
      <h1 class="mb-36 text-heading leading-[1.2] tracking-[-0.015em]">
        {member.name}’s {dayHeading(now)}
      </h1>
      <MemberGlance root={root} name={member.name} now={now} />
      <MemberProjects root={root} name={member.name} now={now} />
    </>
  );
}
