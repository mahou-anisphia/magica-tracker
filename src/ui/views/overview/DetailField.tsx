import { EditableText } from './EditableText';

/** A labelled free-text field inside "More details". */
export function DetailField(props: {
  label: string;
  value: string | undefined;
  placeholder: string;
  multiline?: boolean;
  onSave: (text: string) => void;
}) {
  return (
    <div class="grid min-w-0 grid-cols-1 gap-4">
      <span class="text-12 font-medium text-body">{props.label}</span>
      <EditableText
        box="m-0 rounded-10 border border-line bg-card px-12 py-8"
        class="text-14 text-ink"
        value={props.value ?? ''}
        label={props.label}
        placeholder={props.placeholder}
        multiline={props.multiline}
        onSave={props.onSave}
      />
    </div>
  );
}
