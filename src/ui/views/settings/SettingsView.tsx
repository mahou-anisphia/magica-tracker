import type { Root } from '../../../core/schema';
import type { Backend } from '../../../storage/data';
import { ViewHeader } from '../../components/ViewHeader';
import type { ThemeChoice } from '../../themes';
import { AllocationCard } from './AllocationCard';
import { AppearanceCard } from './AppearanceCard';
import { ProfileCard } from './ProfileCard';
import { StorageCard } from './StorageCard';

/** Settings: the theme (moved here from the top bar), allocation, your name, and storage. */
export function SettingsView(props: {
  root: Root;
  theme: ThemeChoice;
  storage: { backend: Backend; migratedAt?: string } | null;
}) {
  return (
    <>
      <ViewHeader title="Settings" />
      <div class="grid grid-cols-2 items-start gap-24 max-lg:grid-cols-1">
        <AppearanceCard choice={props.theme} />
        <div class="grid grid-cols-1 gap-24">
          <AllocationCard root={props.root} />
          <ProfileCard root={props.root} />
          <StorageCard storage={props.storage} />
        </div>
      </div>
    </>
  );
}
