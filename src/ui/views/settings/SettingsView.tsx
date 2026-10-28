import type { Root } from '../../../core/schema';
import type { Backend } from '../../../storage/data';
import { ViewHeader } from '../../components/ViewHeader';
import type { ThemeChoice } from '../../themes';
import { AllocationCard } from './AllocationCard';
import { AppearanceCard } from './AppearanceCard';
import { CostCentersCard } from './CostCentersCard';
import { ProfileCard } from './ProfileCard';
import { StorageCard } from './StorageCard';
import { WorkdaysCard } from './WorkdaysCard';

/** Settings: the theme (moved here from the top bar), allocation, working days, cost centers, your name, and storage. */
export function SettingsView(props: {
  root: Root;
  now: Date;
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
          <WorkdaysCard root={props.root} now={props.now} />
          <CostCentersCard root={props.root} />
          <ProfileCard root={props.root} />
          <StorageCard storage={props.storage} />
        </div>
      </div>
    </>
  );
}
