import { useEffect, useRef, useState } from 'preact/hooks';
import type { JSX } from 'preact';

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
    <form class={`add-input ${invalid ? 'invalid' : ''}`} onSubmit={submit}>
      <span class="plus" aria-hidden="true">
        +
      </span>
      <input
        type="text"
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
        <span class="hint" role="alert">
          {props.invalidHint}
        </span>
      )}
    </form>
  );
}

/**
 * A text field that saves on Enter (Cmd/Ctrl+Enter when multiline) or blur,
 * and cancels on Escape.
 */
export function InlineInput(props: {
  value: string;
  label: string;
  onSave: (value: string) => void;
  onCancel: () => void;
  multiline?: boolean;
  placeholder?: string;
  class?: string;
}) {
  const [draft, setDraft] = useState(props.value);
  const ref = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const settled = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, []);

  const save = () => {
    if (settled.current) return;
    settled.current = true;
    props.onSave(draft);
  };
  const cancel = () => {
    settled.current = true;
    props.onCancel();
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      cancel();
    } else if (e.key === 'Enter' && (!props.multiline || e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      save();
    }
  };
  const shared = {
    ref,
    class: `inline-input ${props.class ?? ''}`,
    value: draft,
    'aria-label': props.label,
    placeholder: props.placeholder,
    onInput: (e: JSX.TargetedEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft(e.currentTarget.value),
    onKeyDown,
    onBlur: save,
  };
  return props.multiline ? <textarea {...shared} rows={3} /> : <input type="text" {...shared} />;
}

/** Shows text; click it to edit in place. Empty text shows a muted placeholder. */
export function EditableText(props: {
  value: string;
  label: string;
  onSave: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  /** Required fields ignore a blank save instead of clearing. */
  required?: boolean;
  class?: string;
}) {
  const [editing, setEditing] = useState(false);
  if (editing) {
    return (
      <InlineInput
        value={props.value}
        label={props.label}
        multiline={props.multiline}
        placeholder={props.placeholder}
        class={props.class}
        onCancel={() => setEditing(false)}
        onSave={(v) => {
          setEditing(false);
          if (props.required && !v.trim()) return;
          if (v.trim() !== props.value.trim()) props.onSave(v);
        }}
      />
    );
  }
  const empty = !props.value.trim();
  return (
    <button
      type="button"
      class={`editable ${empty ? 'placeholder' : ''} ${props.class ?? ''}`}
      onClick={() => setEditing(true)}
      aria-label={empty ? props.placeholder : `${props.label}: ${props.value}. Click to edit.`}
    >
      {empty ? props.placeholder : props.value}
    </button>
  );
}
