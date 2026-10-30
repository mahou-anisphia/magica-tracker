import { plural } from '../../../core/format';
import { Panel } from '../../components/Panel';

/** The text exactly as Copy puts it on the clipboard. It can be selected and copied by hand too. */
export function PreviewPanel(props: { text: string }) {
  return (
    <Panel id="highlight-preview-h" title="Preview" highlight="highlight-preview" note={`${plural(props.text.length, 'character')} to paste`}>
      <pre class="max-h-560 overflow-auto rounded-10 border border-line bg-page-40 px-14 py-12 font-sans text-13 leading-[1.55] break-words whitespace-pre-wrap text-ink">
        {props.text}
      </pre>
    </Panel>
  );
}
