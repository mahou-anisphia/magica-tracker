import { useEffect, useRef } from 'preact/hooks';

/** What a waiting card waits on, saved on Enter or when you leave the field. */
export function WaitingOnInput(props: { value: string | undefined; autoFocus: boolean; onSave: (text: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (props.autoFocus) ref.current?.focus();
  }, [props.autoFocus]);
  const save = (text: string) => {
    if (text.trim() !== (props.value ?? '')) props.onSave(text);
  };
  return (
    <label class="grid grid-cols-1 gap-4 text-12 font-medium text-body">
      Waiting on
      <input
        ref={ref}
        type="text"
        class="min-h-32 rounded-8 border border-line bg-card px-10 text-14 font-normal text-ink placeholder:text-faint focus:border-accent focus:outline-none max-lg:min-h-44 max-lg:text-16"
        placeholder="A person, a meeting, evidence…"
        value={props.value ?? ''}
        onBlur={(e) => save(e.currentTarget.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') save(e.currentTarget.value);
        }}
      />
    </label>
  );
}
