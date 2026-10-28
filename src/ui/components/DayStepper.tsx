import { plural } from '../../core/format';
import { MinusIcon, PlusIcon } from './icons';

/** Whole days for one project: − and + around the count ("5 days", or a dash for none). */
export function DayStepper(props: { name: string; days: number; onChange: (days: number) => void }) {
  const { days } = props;
  return (
    <span class="inline-flex flex-none items-center gap-2 rounded-10 border border-line bg-card p-2">
      <button
        type="button"
        class="icon-btn disabled:cursor-default disabled:opacity-40"
        aria-label={`One day less for ${props.name}`}
        disabled={days === 0}
        onClick={() => props.onChange(days - 1)}
      >
        <MinusIcon size={14} />
      </button>
      <output class={`min-w-64 text-center text-14 tabular-nums ${days ? 'font-medium text-ink' : 'text-faint'}`} aria-live="polite">
        {days ? plural(days, 'day') : '—'}
        {!days && <span class="sr-only">no days for {props.name}</span>}
      </output>
      <button type="button" class="icon-btn" aria-label={`One day more for ${props.name}`} onClick={() => props.onChange(days + 1)}>
        <PlusIcon size={14} />
      </button>
    </span>
  );
}
