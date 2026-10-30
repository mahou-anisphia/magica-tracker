import { useEffect, useState } from 'preact/hooks';
import { setTaskOutcome } from '../../actions';
import { FIELD_BOX } from './field';

/** A finished task's outcome, typed in place: saved when you leave it or press Enter; Escape puts it back. Dashed while empty. */
export function OutcomeInput(props: { projectId: string; taskId: string; title: string; value: string | undefined }) {
  const saved = props.value ?? '';
  const [text, setText] = useState(saved);
  useEffect(() => setText(saved), [saved]);
  const save = () => {
    if (text.trim() !== saved) setTaskOutcome(props.projectId, props.taskId, text);
  };
  return (
    <input
      type="text"
      class={`${FIELD_BOX} ${saved ? 'border-line bg-card' : 'border-dashed border-line-strong bg-transparent'}`}
      aria-label={`Outcome of “${props.title}”`}
      placeholder="+ Outcome: what came of it"
      value={text}
      onInput={(e) => setText(e.currentTarget.value)}
      onBlur={save}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          save();
          e.currentTarget.blur();
        } else if (e.key === 'Escape') {
          setText(saved);
          e.currentTarget.blur();
        }
      }}
    />
  );
}
