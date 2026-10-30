import { useEffect, useState } from 'preact/hooks';
import { FIELD } from './field';

/**
 * A whole number between `min` and `max`, typed. It changes as soon as what's
 * typed is a number in range; anything else is put back when you leave it.
 */
export function NumberField(props: { label: string; value: number; min: number; max: number; step?: number; onChange: (n: number) => void }) {
  const [text, setText] = useState(String(props.value));
  useEffect(() => {
    if (Number(text) !== props.value) setText(String(props.value));
  }, [props.value]);
  return (
    <label class="inline-flex items-center gap-8 text-13 font-medium whitespace-nowrap text-body">
      {props.label}
      <input
        type="number"
        inputMode="numeric"
        class={`${FIELD} w-84 tabular-nums`}
        min={props.min}
        max={props.max}
        step={props.step ?? 1}
        value={text}
        onInput={(e) => {
          const t = e.currentTarget.value;
          setText(t);
          const n = Number(t);
          if (t && Number.isInteger(n) && n >= props.min && n <= props.max) props.onChange(n);
        }}
        onBlur={() => setText(String(props.value))}
      />
    </label>
  );
}
