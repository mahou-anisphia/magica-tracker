import { useState } from 'preact/hooks';
import { InlineInput } from './InlineInput';

/** Margin, padding, border, radius and background. `box` replaces it whole. */
const BOX = '-mx-8 rounded-8 border border-transparent bg-transparent px-8 py-2 hover:border-line hover:bg-card';

/**
 * Shows text; click it to edit in place. Empty text shows a muted placeholder.
 * `class` (type and colour) applies in both states. `box`, when given, styles
 * both the text and the field, instead of each one's own default.
 */
export function EditableText(props: {
  value: string;
  label: string;
  onSave: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  /** Required fields ignore a blank save instead of clearing. */
  required?: boolean;
  class?: string;
  box?: string;
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
        box={props.box}
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
      // data-empty wins over a colour in `class`: the placeholder is always muted.
      class={`block w-full cursor-text text-left whitespace-pre-wrap data-empty:text-faint ${props.box ?? BOX} ${props.class ?? ''}`}
      data-empty={empty || undefined}
      onClick={() => setEditing(true)}
      aria-label={empty ? props.placeholder : `${props.label}: ${props.value}. Click to edit.`}
    >
      {empty ? props.placeholder : props.value}
    </button>
  );
}
