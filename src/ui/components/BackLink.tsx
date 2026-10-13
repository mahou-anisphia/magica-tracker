import { ChevronIcon } from './icons';
import { go } from '../store';

/** "← Your tracker": the way home from the screens the orb opens. */
export function BackLink() {
  return (
    <button
      type="button"
      class="-ml-6 inline-flex min-h-(--tap) cursor-pointer items-center gap-6 rounded-10 bg-transparent py-4 pr-10 pl-6 text-13 font-medium text-body hover:text-primary-ink"
      onClick={() => go('overview')}
    >
      <ChevronIcon dir="left" />
      Your tracker
    </button>
  );
}
