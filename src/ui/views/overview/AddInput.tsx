import { useState } from 'preact/hooks';

/** The dashed "+ Add …" field look, shared with the "Add a resource…" trigger. */
export const ADD_FIELD =
  'flex items-center gap-8 rounded-12 border bg-card/45 px-14 py-2 transition-[border-color,background-color] duration-120 focus-within:bg-card';
export const ADD_BORDER = 'border-dashed border-ash/80 focus-within:border-solid focus-within:border-iris';

/**
 * An always-visible "+ Add …" field. Enter adds and keeps focus for the next
 * one. If `onAdd` returns false the text stays, marked with `invalidHint`.
 */
export function AddInput(props: {
  placeholder: string;
  label: string;
  onAdd: (text: string) => boolean | void;
  onCancel?: () => void;
  shortcut?: string;
  invalidHint?: string;
  class?: string;
}) {
  const [value, setValue] = useState('');
  const [invalid, setInvalid] = useState(false);
  const submit = (e: Event) => {
    e.preventDefault();
    const text = value.trim();
    if (!text) return;
    if (props.onAdd(text) === false) {
      setInvalid(true);
      return;
    }
    setValue('');
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      setValue('');
      setInvalid(false);
      (e.currentTarget as HTMLInputElement).blur();
      props.onCancel?.();
    }
  };
  return (
    <form
      class={`${ADD_FIELD} ${invalid ? 'border-solid border-burnished' : ADD_BORDER} ${props.class ?? ''}`}
      onSubmit={submit}
    >
      <span class="text-[1.05rem] leading-none text-slate" aria-hidden="true">
        +
      </span>
      <input
        type="text"
        class="min-h-[calc(var(--tap)+4px)] min-w-0 flex-1 bg-transparent px-2 py-1 outline-none placeholder:text-slate placeholder:opacity-75"
        value={value}
        onInput={(e) => {
          setValue(e.currentTarget.value);
          setInvalid(false);
        }}
        onKeyDown={onKeyDown}
        placeholder={props.placeholder}
        aria-label={props.label}
        aria-invalid={invalid || undefined}
        data-shortcut={props.shortcut}
        enterKeyHint="done"
        autoComplete="off"
      />
      {invalid && props.invalidHint && (
        <span class="flex-none rounded-full bg-gold-tint px-9 py-1 text-12 font-medium text-gold-ink" role="alert">
          {props.invalidHint}
        </span>
      )}
    </form>
  );
}
