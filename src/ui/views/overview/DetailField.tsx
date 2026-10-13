import type { ComponentChildren } from 'preact';
import { DetailRow } from './DetailRow';
import { EditableText } from './EditableText';

/** A free-text row in "More details": click to edit, saved when you leave it. */
export function DetailField(props: {
  label: string;
  value: string | undefined;
  placeholder: string;
  multiline?: boolean;
  note?: ComponentChildren;
  onSave: (text: string) => void;
}) {
  return (
    <DetailRow label={props.label} note={props.note}>
      <EditableText
        box="m-0 min-h-36 rounded-10 border border-line bg-card px-12 py-7"
        class="text-14 text-ink"
        value={props.value ?? ''}
        label={props.label}
        placeholder={props.placeholder}
        multiline={props.multiline}
        onSave={props.onSave}
      />
    </DetailRow>
  );
}
