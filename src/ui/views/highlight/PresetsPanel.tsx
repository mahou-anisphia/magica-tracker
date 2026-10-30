import type { PresetChoice } from '../../../core/highlight';
import type { HighlightFormat, Root } from '../../../core/schema';
import { deletePreset, savePreset } from '../../actions';
import { PencilIcon, PlusIcon, TrashIcon } from '../../components/icons';
import { Panel } from '../../components/Panel';
import { toast } from '../../store';
import { PresetForm, type PresetDraft } from './PresetForm';
import { PresetGroup } from './PresetGroup';
import { PresetRow } from './PresetRow';

const LIST = '-mx-22 divide-y divide-line border-y border-line max-md:-mx-16';
const SHAPE: Record<HighlightFormat, string> = { bullets: 'Bullet points', sentence: 'One sentence' };

/** Each draft gets its own form, so starting another while one is open replaces it. */
const draftKeys = new WeakMap<PresetDraft, number>();
let draftSeq = 0;
const keyOf = (d: PresetDraft) => draftKeys.get(d) ?? (draftKeys.set(d, ++draftSeq), draftSeq);

/**
 * Every preset: yours (edit, delete, share), the built-in ones (duplicate to
 * change one) and the ones teammates shared in their files (copy to yours).
 * Clicking one uses it. A teammate's stays theirs: copying makes your own.
 */
export function PresetsPanel(props: {
  root: Root;
  choices: PresetChoice[];
  selected: string;
  draft: PresetDraft | null;
  onPick: (key: string) => void;
  onDraft: (draft: PresetDraft | null) => void;
}) {
  const { choices, selected, draft } = props;
  const mine = props.root.highlightPresets ?? [];
  const builtIn = choices.filter((c) => c.source === 'built-in');
  const team = choices.filter((c) => c.source === 'team');
  const startFrom = (c: PresetChoice, name: string) => props.onDraft({ id: null, name, body: c.body, format: c.format, shared: false });
  const copyToMine = (c: PresetChoice) => {
    const id = savePreset(null, { name: c.name, body: c.body, format: c.format });
    if (!id) return;
    props.onPick(`mine:${id}`);
    toast(`Copied “${c.name}” to your presets`);
  };

  return (
    <Panel
      id="highlight-presets-h"
      title="Presets"
      highlight="highlight-presets"
      note="Click one to use it. The base rules are added to every one."
      aside={
        !draft && (
          <button
            type="button"
            class="btn btn-quiet btn-small text-primary-ink"
            onClick={() => props.onDraft({ id: null, name: '', body: '', format: 'bullets', shared: false })}
          >
            <PlusIcon size={14} />
            New
          </button>
        )
      }
    >
      {draft && (
        <PresetForm
          key={keyOf(draft)}
          draft={draft}
          onDone={(id) => {
            props.onDraft(null);
            if (id) props.onPick(`mine:${id}`);
          }}
        />
      )}

      {mine.length > 0 && (
        <PresetGroup heading="Yours">
          <ul class={LIST}>
            {mine.map((h) => (
              <PresetRow
                key={h.id}
                name={h.name}
                sub={[SHAPE[h.format], h.shared ? 'Shared' : ''].filter(Boolean).join(' · ')}
                selected={selected === `mine:${h.id}`}
                onUse={() => props.onPick(`mine:${h.id}`)}
              >
                <button
                  type="button"
                  class="icon-btn"
                  aria-label={`Edit “${h.name}”`}
                  onClick={() => props.onDraft({ id: h.id, name: h.name, body: h.body, format: h.format, shared: h.shared })}
                >
                  <PencilIcon />
                </button>
                <button type="button" class="icon-btn hover:text-primary-ink" aria-label={`Delete “${h.name}”`} onClick={() => deletePreset(h)}>
                  <TrashIcon />
                </button>
              </PresetRow>
            ))}
          </ul>
        </PresetGroup>
      )}

      <PresetGroup heading="Built in">
        <ul class={LIST}>
          {builtIn.map((c) => (
            <PresetRow key={c.key} name={c.name} sub={c.format === 'sentence' ? SHAPE.sentence : undefined} selected={selected === c.key} onUse={() => props.onPick(c.key)}>
              <button type="button" class="btn btn-quiet btn-small" aria-label={`Duplicate “${c.name}” to change it`} onClick={() => startFrom(c, `${c.name} (mine)`)}>
                Duplicate
              </button>
            </PresetRow>
          ))}
        </ul>
      </PresetGroup>

      {team.length > 0 && (
        <PresetGroup heading="From your team">
          <ul class={LIST}>
            {team.map((c) => (
              <PresetRow key={c.key} name={c.name} sub={`${c.owner}’s · ${SHAPE[c.format]}`} selected={selected === c.key} onUse={() => props.onPick(c.key)}>
                <button type="button" class="btn btn-quiet btn-small" aria-label={`Copy “${c.name}” to your presets`} onClick={() => copyToMine(c)}>
                  Copy to mine
                </button>
              </PresetRow>
            ))}
          </ul>
        </PresetGroup>
      )}
    </Panel>
  );
}
