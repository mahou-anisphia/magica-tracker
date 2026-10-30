import type { PresetChoice } from '../../../core/highlight';
import { Panel } from '../../components/Panel';
import { Select } from '../../components/Select';
import { BODY_FIELD } from './field';
import { NumberField } from './NumberField';

/** How a choice reads in the picker: a teammate's says whose it is. */
const choiceLabel = (c: PresetChoice) => (c.owner ? `${c.name} · ${c.owner}` : c.name);

/**
 * The prompt: a preset, its body (changed here for this export only), the
 * numbers it fills in and whether in-progress work comes too. The base rules
 * follow the body; the preview shows them filled in.
 */
export function PromptPanel(props: {
  choices: PresetChoice[];
  preset: PresetChoice;
  body: string | null;
  maxItems: number;
  wordLimit: number;
  inProgress: boolean;
  onPick: (key: string) => void;
  onBody: (body: string) => void;
  onMaxItems: (n: number) => void;
  onWordLimit: (n: number) => void;
  onInProgress: (on: boolean) => void;
  onSaveAs: () => void;
}) {
  const { preset } = props;
  const edited = props.body !== null;
  return (
    <Panel id="highlight-prompt-h" title="Prompt" highlight="highlight-prompt">
      <div class="flex flex-wrap items-center justify-between gap-12">
        <span class="font-medium text-ink" aria-hidden="true">
          Preset
        </span>
        <Select
          label="Preset"
          class="max-w-full min-w-200"
          value={preset.key}
          options={props.choices.map((c) => ({ value: c.key, label: choiceLabel(c) }))}
          onChange={props.onPick}
        />
      </div>
      <div class="grid grid-cols-1 gap-6">
        <textarea
          class={BODY_FIELD}
          aria-label={`The prompt for ${preset.name}`}
          rows={4}
          value={props.body ?? preset.body}
          onInput={(e) => props.onBody(e.currentTarget.value)}
        />
        {edited ? (
          <p class="flex flex-wrap items-center gap-x-8 gap-y-2 text-12 text-body">
            Changed for this export only.
            <button type="button" class="cursor-pointer bg-transparent font-medium text-primary-ink hover:underline" onClick={() => props.onBody(preset.body)}>
              Undo changes
            </button>
            <button type="button" class="cursor-pointer bg-transparent font-medium text-primary-ink hover:underline" onClick={props.onSaveAs}>
              Save as a preset
            </button>
          </p>
        ) : (
          <p class="text-12 text-body">The base rules follow it: the shape, past tense, no filler, nothing made up.</p>
        )}
      </div>
      <div class="flex flex-wrap items-center gap-x-20 gap-y-10">
        {preset.format === 'bullets' ? (
          <NumberField label="Bullet points at most" value={props.maxItems} min={1} max={10} onChange={props.onMaxItems} />
        ) : (
          <span class="text-13 font-medium text-body">One sentence</span>
        )}
        <NumberField label="Words at most" value={props.wordLimit} min={10} max={2000} step={10} onChange={props.onWordLimit} />
      </div>
      <label class="flex cursor-pointer items-center gap-8 text-14 text-ink">
        <input type="checkbox" checked={props.inProgress} onChange={(e) => props.onInProgress(e.currentTarget.checked)} />
        Include tasks in progress
      </label>
    </Panel>
  );
}
