import type { ComponentChildren } from 'preact';
import { useRef } from 'preact/hooks';
import { startTeamImport } from '../../actions';

/**
 * A button that opens the file chooser for exported tracker files. With
 * `forMember`, a file that names nobody in the team goes to that member.
 */
export function ImportFilesButton(props: { class: string; forMember?: string; label?: string; children: ComponentChildren }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <button type="button" class={props.class} aria-label={props.label} onClick={() => input.current?.click()}>
        {props.children}
      </button>
      <input
        ref={input}
        type="file"
        accept=".json,application/json"
        multiple={!props.forMember}
        class="hidden"
        onChange={(e) => {
          const files = [...(e.currentTarget.files ?? [])];
          e.currentTarget.value = '';
          void startTeamImport(files, props.forMember);
        }}
      />
    </>
  );
}
