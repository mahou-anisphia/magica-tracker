import { useState } from 'preact/hooks';
import { dueByDate } from '../../../core/calendar';
import { dayHeading } from '../../../core/format';
import type { Member } from '../../../core/team';
import { MonthCalendar } from '../../components/MonthCalendar';
import { MemberBanner } from './MemberBanner';
import { MemberDayPanel } from './MemberDayPanel';
import { MemberGlance } from './MemberGlance';
import { MemberProjects } from './MemberProjects';
import { MemberTabs, type MemberTab } from './MemberTabs';

/**
 * "View as": someone's tracker from their latest file, read-only. A first
 * version: their numbers, allocation and active projects, or their deadlines
 * by month. Which one shows isn't remembered.
 */
export function MemberView(props: { member: Member; now: Date }) {
  const { member, now } = props;
  const root = member.snapshot!.root;
  const [tab, setTab] = useState<MemberTab>('overview');
  const [day, setDay] = useState<string | null>(null);
  return (
    <>
      <MemberBanner member={member} />
      <MemberTabs tab={tab} name={member.name} onChange={setTab} />
      {tab === 'overview' ? (
        <>
          <h1 class="mb-36 text-heading leading-[1.2] tracking-[-0.015em]">
            {member.name}’s {dayHeading(now)}
          </h1>
          <MemberGlance root={root} name={member.name} now={now} />
          <MemberProjects root={root} name={member.name} now={now} />
        </>
      ) : (
        <>
          <MonthCalendar root={root} now={now} day={day} whose={member.name} onOpenDay={(date) => setDay(date)} />
          <MemberDayPanel
            date={day}
            items={day ? (dueByDate(root, now).get(day) ?? []) : []}
            name={member.name}
            now={now}
            onClose={() => setDay(null)}
          />
        </>
      )}
    </>
  );
}
