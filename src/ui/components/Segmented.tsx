import { useId } from 'preact/hooks';

/** A small segmented choice built from radio buttons, so arrow keys work. */
export function Segmented<T extends string>(props: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  const name = `seg-${useId()}`;
  return (
    <div role="radiogroup" aria-label={props.label} class="inline-flex gap-2 rounded-10 bg-chip-55 p-3">
      {props.options.map((o) => (
        <label
          key={o.value}
          class="cursor-pointer rounded-8 px-12 py-3 text-13 font-medium text-body hover:text-primary-ink has-checked:bg-card has-checked:text-ink has-checked:shadow-segment has-focus-visible:outline-2 has-focus-visible:outline-accent"
        >
          <input type="radio" name={name} class="sr-only" checked={o.value === props.value} onChange={() => props.onChange(o.value)} />
          {o.label}
        </label>
      ))}
    </div>
  );
}
