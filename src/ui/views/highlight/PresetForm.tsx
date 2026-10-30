import { useState } from 'preact/hooks';
import type { HighlightFormat } from '../../../core/schema';
import { savePreset } from '../../actions';
import { Segmented } from '../../components/Segmented';
import { BODY_FIELD, FIELD } from './field';

/** A preset being written: a new one (`id` null, maybe started from another) or one of yours. */
export type PresetDraft = { id: string | null; name: string; body: string; format: HighlightFormat; shared: boolean };

const FORMATS: { value: HighlightFormat; label: string }[] = [
  { value: 'bullets', label: 'Bullet points' },
  { value: 'sentence', label: 'One sentence' },
];

/**
 * A preset's name, body, shape and whether teammates see it. Save waits for a
 * name and a body; it hands back the saved id. It reads the draft once: give
 * each draft its own `key`.
 */
export function PresetForm(props: { draft: PresetDraft; onDone: (savedId: string | null) => void }) {
  const d = props.draft;
  const [name, setName] = useState(d.name);
  const [body, setBody] = useState(d.body);
  const [format, setFormat] = useState(d.format);
  const [shared, setShared] = useState(d.shared);
  const empty = !name.trim() || !body.trim();
  const submit = (e: Event) => {
    e.preventDefault();
    if (!empty) props.onDone(savePreset(d.id, { name, body, format, shared }));
  };

  return (
    <form
      class="grid grid-cols-1 gap-10 rounded-12 border border-accent-line bg-card p-12"
      onSubmit={submit}
      onKeyDown={(e) => {
        if (e.key !== 'Escape') return;
        e.preventDefault();
        props.onDone(null);
      }}
    >
      <input class={FIELD} aria-label="Preset name" placeholder="Name" value={name} autoFocus onInput={(e) => setName(e.currentTarget.value)} />
      <textarea
        class={BODY_FIELD}
        aria-label="Prompt"
        placeholder="What to pick and how to frame it. {{max_items}}, {{char_limit}} and {{week_range}} are filled in."
        rows={4}
        value={body}
        onInput={(e) => setBody(e.currentTarget.value)}
      />
      <div class="flex flex-wrap items-center justify-between gap-12">
        <span class="text-13 font-medium text-body" aria-hidden="true">
          Asks for
        </span>
        <Segmented label="Asks for" value={format} options={FORMATS} onChange={setFormat} />
      </div>
      <label class="grid cursor-pointer grid-cols-[auto_minmax(0,1fr)] items-start gap-x-8 text-14 text-ink">
        <input type="checkbox" class="mt-3" checked={shared} onChange={(e) => setShared(e.currentTarget.checked)} />
        Share with my team
        <span class="col-start-2 text-12 text-body">
          Teammates who import your file can pick it. Your file holds every preset either way, as it’s your backup; unshared ones just don’t show.
        </span>
      </label>
      <div class="flex items-center justify-end gap-6">
        <button type="button" class="btn btn-quiet btn-small" onClick={() => props.onDone(null)}>
          Cancel
        </button>
        <button type="submit" class="btn btn-primary btn-small" disabled={empty}>
          {d.id ? 'Save' : 'Add'}
        </button>
      </div>
    </form>
  );
}
