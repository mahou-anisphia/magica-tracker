import { useState } from 'preact/hooks';
import {
  buildPrompt,
  DEFAULT_CHAR_LIMIT,
  DEFAULT_MAX_ITEMS,
  DEFAULT_PRESET,
  highlightItems,
  lastWeek,
  presetChoices,
  type DateRange,
} from '../../../core/highlight';
import type { Root } from '../../../core/schema';
import type { Team } from '../../../core/team';
import { ViewHeader } from '../../components/ViewHeader';
import { HighlightTasks } from './HighlightTasks';
import type { PresetDraft } from './PresetForm';
import { PresetsPanel } from './PresetsPanel';
import { PreviewPanel } from './PreviewPanel';
import { PromptPanel } from './PromptPanel';
import { RangeStrip } from './RangeStrip';

/**
 * The weekly highlight: a prompt and a range's tasks as one text to paste into
 * the company's Copilot. It opens on last Monday to Sunday with the Standard
 * preset, so Copy is ready straight away. The prompt's body can be changed for
 * one export without touching its preset; presets are kept in the panel under
 * the preview, with your teammates' shared ones beside yours.
 */
export function HighlightView(props: { root: Root; team: Team; now: Date }) {
  const { root, team, now } = props;
  const [range, setRange] = useState<DateRange>(() => lastWeek(now));
  const choices = presetChoices(root, team);
  const [presetKey, setPresetKey] = useState(DEFAULT_PRESET);
  // A deleted preset (or a teammate's file that dropped it) falls back to Standard.
  const preset = choices.find((c) => c.key === presetKey) ?? choices[0]!;
  /** The body edited for this export only; null while it's the preset's own. */
  const [body, setBody] = useState<string | null>(null);
  const [maxItems, setMaxItems] = useState(DEFAULT_MAX_ITEMS);
  const [charLimit, setCharLimit] = useState(DEFAULT_CHAR_LIMIT);
  const [inProgress, setInProgress] = useState(false);
  const [draft, setDraft] = useState<PresetDraft | null>(null);

  const items = highlightItems(root, range, inProgress);
  const text = buildPrompt({ body: body ?? preset.body, format: preset.format, range, maxItems, charLimit, items });
  // A preset saved a moment ago isn't in `choices` until the next render, so the key is taken as given.
  const pick = (key: string) => {
    setPresetKey(key);
    setBody(null);
    // "Shipped + in-flight" asks for something in progress, so it brings it in.
    if (choices.find((c) => c.key === key)?.inProgress) setInProgress(true);
  };

  return (
    <>
      <ViewHeader title="Weekly highlight">A week’s tasks under a prompt, ready to paste into Copilot. Nothing leaves this browser.</ViewHeader>
      <RangeStrip range={range} now={now} text={text} onChange={setRange} />

      <div class="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-start gap-24 max-lg:grid-cols-1">
        <div class="grid grid-cols-1 gap-24">
          <PromptPanel
            choices={choices}
            preset={preset}
            body={body}
            maxItems={maxItems}
            charLimit={charLimit}
            inProgress={inProgress}
            onPick={pick}
            onBody={(b) => setBody(b === preset.body ? null : b)}
            onMaxItems={setMaxItems}
            onCharLimit={setCharLimit}
            onInProgress={setInProgress}
            onSaveAs={() => setDraft({ id: null, name: '', body: body ?? preset.body, format: preset.format, shared: false })}
          />
          <HighlightTasks items={items} range={range} inProgress={inProgress} />
        </div>
        <div class="grid grid-cols-1 gap-24">
          <PreviewPanel text={text} />
          <PresetsPanel root={root} choices={choices} selected={preset.key} draft={draft} onPick={pick} onDraft={setDraft} />
        </div>
      </div>
    </>
  );
}
