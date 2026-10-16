/** The sidebar's lists and rows, shared by its project lists and the backlog link. */
export const NAV_LIST = 'grid grid-cols-1 gap-2';
const NAV_ITEM =
  'flex min-h-(--tap) w-full cursor-pointer items-center gap-10 rounded-10 border px-12 py-4 text-left max-lg:min-h-44';
const CURRENT = 'border-line bg-card font-medium shadow-card';

/** A row in the list. Completed and archived ones stay muted, even when open. */
export function navItemClass(current: boolean, muted = false): string {
  const color = muted ? 'text-faint' : current ? 'text-ink' : 'text-body hover:text-primary-ink';
  return `${NAV_ITEM} ${current ? CURRENT : 'border-transparent bg-transparent'} ${color}`;
}
