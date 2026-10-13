import type { JSX } from 'preact';
import { CalendarIcon, ListIcon } from '../../components/icons';

export type MemberTab = 'overview' | 'timeline';

/** Their Overview or their Timeline: the same switch as your top bar, for their file. */
export function MemberTabs(props: { tab: MemberTab; name: string; onChange: (tab: MemberTab) => void }) {
  const option = (tab: MemberTab, label: string, icon: JSX.Element) => (
    <button
      type="button"
      class="inline-flex min-h-(--tap) cursor-pointer items-center gap-8 rounded-9 bg-transparent px-16 py-4 text-15 font-medium text-body aria-pressed:bg-card aria-pressed:text-ink aria-pressed:shadow-segment hover:aria-[pressed=false]:text-primary-ink"
      aria-pressed={props.tab === tab}
      onClick={() => props.onChange(tab)}
    >
      {icon}
      {label}
    </button>
  );
  return (
    <nav class="mb-28 inline-flex gap-2 rounded-12 bg-chip-55 p-4" aria-label={`${props.name}’s view`}>
      {option('overview', 'Overview', <ListIcon />)}
      {option('timeline', 'Timeline', <CalendarIcon />)}
    </nav>
  );
}
