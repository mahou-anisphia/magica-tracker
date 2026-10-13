import { STATUSES, type Status } from '../../../core/schema';
import { STATUS_LABEL } from '../../components/StatusChip';

/** Four status buttons, two by two to fit a card; one row on phones, where cards are full width. */
export function StatusPicker(props: { label: string; value: Status; onChange: (status: Status) => void }) {
  return (
    <div role="group" aria-label={props.label} class="grid grid-cols-2 gap-3 rounded-10 bg-chip-55 p-3 max-md:grid-cols-4">
      {STATUSES.map((s) => (
        <button
          key={s}
          type="button"
          aria-pressed={props.value === s}
          class="min-h-30 cursor-pointer rounded-8 bg-transparent px-8 text-13 font-medium text-body aria-pressed:bg-card aria-pressed:text-ink aria-pressed:shadow-segment hover:aria-[pressed=false]:text-primary-ink max-lg:min-h-44"
          onClick={() => props.onChange(s)}
        >
          {STATUS_LABEL[s]}
        </button>
      ))}
    </div>
  );
}
