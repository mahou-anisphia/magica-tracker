import type { JSX } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';

/** Margin, padding, border, radius and background. `box` replaces it whole. */
const BOX = '-mx-8 rounded-8 border border-iris bg-card px-8 py-2';

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
  box?: string;
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
    class: `block w-full resize-y ring-3 ring-iris/18 outline-none ${props.multiline ? 'field-sizing-content min-h-[4.5em]' : ''} ${props.box ?? BOX} ${props.class ?? ''}`,
    value: draft,
    'aria-label': props.label,
    placeholder: props.placeholder,
    onInput: (e: JSX.TargetedEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft(e.currentTarget.value),
    onKeyDown,
    onBlur: save,
  };
  return props.multiline ? <textarea {...shared} rows={3} /> : <input type="text" {...shared} />;
}
