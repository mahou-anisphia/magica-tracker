import { useEffect, useRef, useState } from 'preact/hooks';
import type * as ops from '../../../core/ops';
import type { Resource } from '../../../core/schema';
import { headerFromUrl, normalizeUrlInput, parseResourceInput } from '../../../core/url';

let formSeq = 0;

const FIELD = 'grid grid-cols-1 gap-5';
const LABEL = 'text-12 font-medium text-slate';
const INPUT =
  'min-h-36 min-w-0 rounded-9 border bg-card px-12 py-4 text-15 text-deep outline-none transition-[border-color,box-shadow] duration-120 placeholder:text-steel max-lg:text-16';
const INPUT_OK = 'border-line focus:border-iris focus:ring-3 focus:ring-iris/16';
const INPUT_BAD = 'border-burnished ring-3 ring-gold/25';

/**
 * Link, title and an optional note, with Cancel and Add. Enter submits and
 * Escape cancels. While the title is empty, its placeholder shows the title
 * the link will get. Pasting "Title https://…" into the link splits it.
 * Adding keeps the form open for the next one; editing closes on Save.
 */
export function ResourceForm(props: { initial?: Resource; onSubmit: (input: ops.ResourceInput) => void; onClose: () => void }) {
  const editing = !!props.initial;
  const [uid] = useState(() => `res-form-${++formSeq}`);
  const [url, setUrl] = useState(props.initial?.url ?? '');
  const [header, setHeader] = useState(props.initial?.header ?? '');
  const [note, setNote] = useState(props.initial?.note ?? '');
  const [bad, setBad] = useState(false);
  const linkRef = useRef<HTMLInputElement>(null);
  const closed = useRef(false);

  // autoFocus only applies on page load, not to fields rendered later.
  useEffect(() => linkRef.current?.focus(), []);

  const normalized = normalizeUrlInput(url);
  const derivedTitle = normalized ? headerFromUrl(normalized) : '';

  const close = () => {
    if (closed.current) return;
    closed.current = true;
    props.onClose();
  };

  const submit = (e?: Event) => {
    e?.preventDefault();
    if (!normalized) {
      setBad(true);
      linkRef.current?.focus();
      return;
    }
    props.onSubmit({ header: header.trim() || derivedTitle, url: normalized, note });
    if (editing) {
      closed.current = true;
      return;
    }
    setUrl('');
    setHeader('');
    setNote('');
    setBad(false);
    linkRef.current?.focus();
  };

  const onLinkInput = (value: string) => {
    setBad(false);
    // "Threat model v2 https://…" pasted whole: split it into title and link.
    if (/\s/.test(value.trim()) && !header.trim()) {
      const parsed = parseResourceInput(value);
      if (parsed && parsed.header !== headerFromUrl(parsed.url)) {
        setUrl(parsed.url);
        setHeader(parsed.header);
        return;
      }
    }
    setUrl(value);
  };

  const empty = !url.trim() && !header.trim() && !note.trim();

  return (
    <form
      // Editing replaces the row it sits in, so it drops the card's own frame.
      class={`grid grid-cols-1 gap-14 px-18 pt-16 pb-14 max-lg:p-14 ${editing ? 'bg-iris-tint-45' : 'rounded-12 border border-iris-line bg-card ring-3 ring-iris/10'}`}
      noValidate
      aria-label={editing ? `Edit ${props.initial!.header}` : 'Add a resource'}
      onSubmit={submit}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          close();
        }
      }}
      onFocusOut={(e) => {
        // Leaving an untouched new form closes it; anything typed stays put.
        if (editing || e.currentTarget.contains(e.relatedTarget as Node | null)) return;
        if (empty) close();
      }}
    >
      <div class="grid grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] gap-x-14 gap-y-12 max-lg:grid-cols-1">
        <label class={FIELD} for={`${uid}-link`}>
          <span class={LABEL}>Link</span>
          <input
            id={`${uid}-link`}
            ref={linkRef}
            type="text"
            class={`${INPUT} ${bad ? INPUT_BAD : INPUT_OK}`}
            inputMode="url"
            value={url}
            onInput={(e) => onLinkInput(e.currentTarget.value)}
            placeholder="docs.example.com/page"
            aria-label="Resource link"
            aria-invalid={bad || undefined}
            aria-describedby={bad ? `${uid}-error` : undefined}
            autoComplete="off"
            autoCapitalize="off"
            spellcheck={false}
          />
        </label>
        <label class={FIELD} for={`${uid}-title`}>
          <span class={LABEL}>Title</span>
          <input
            id={`${uid}-title`}
            type="text"
            class={`${INPUT} ${INPUT_OK}`}
            value={header}
            onInput={(e) => setHeader(e.currentTarget.value)}
            placeholder={derivedTitle || 'What is this document?'}
            aria-label="Resource title"
            autoComplete="off"
          />
        </label>
        <label class={`${FIELD} col-span-full`} for={`${uid}-note`}>
          <span class={LABEL}>
            Note <span class="font-normal text-steel">optional</span>
          </span>
          <input
            id={`${uid}-note`}
            type="text"
            class={`${INPUT} ${INPUT_OK}`}
            value={note}
            onInput={(e) => setNote(e.currentTarget.value)}
            placeholder="Why it matters, or where to look"
            aria-label="Resource note"
            autoComplete="off"
          />
        </label>
      </div>
      <div class="flex flex-wrap items-center gap-x-12 gap-y-8">
        {bad && (
          <p class="text-13 text-gold-ink" id={`${uid}-error`} role="alert">
            Add a link, like docs.example.com/page.
          </p>
        )}
        <div class="ml-auto flex gap-6">
          <button type="button" class="btn btn-quiet btn-small" onClick={close}>
            Cancel
          </button>
          <button type="submit" class="btn btn-primary btn-small">
            {editing ? 'Save' : 'Add resource'}
          </button>
        </div>
      </div>
    </form>
  );
}
