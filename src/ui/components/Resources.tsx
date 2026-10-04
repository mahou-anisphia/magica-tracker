import { useEffect, useRef, useState } from 'preact/hooks';
import { newId } from '../../core/id';
import * as ops from '../../core/ops';
import type { Resource } from '../../core/schema';
import { headerFromUrl, normalizeUrlInput, parseResourceInput, shortUrl } from '../../core/url';
import { update, updateWithUndo } from '../store';
import { CrossIcon, ExternalIcon, PencilIcon } from './icons';

let formSeq = 0;

/** Linked documents, then a dashed "+ Add a resource…" row that opens into a small form. */
export function Resources(props: { target: ops.ResourceTarget; resources: Resource[] }) {
  const { target, resources } = props;
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <div class="resources">
      {resources.length > 0 && (
        <ul class="resource-list">
          {resources.map((r) =>
            editingId === r.id ? (
              <li key={r.id} class="resource-editing">
                <ResourceForm
                  initial={r}
                  onSubmit={(input) => {
                    update((root, now) => ops.updateResource(root, target, r.id, input, now));
                    setEditingId(null);
                  }}
                  onClose={() => setEditingId(null)}
                />
              </li>
            ) : (
              <li key={r.id} class="resource">
                <span class="res-mark" aria-hidden="true" />
                <div class="res-body">
                  <a class="res-header" href={r.url} target="_blank" rel="noopener noreferrer">
                    {r.header}
                    <ExternalIcon />
                    <span class="sr-only"> (opens in a new tab)</span>
                  </a>
                  <span class="res-url">{shortUrl(r.url)}</span>
                  {r.note && <span class="res-note">{r.note}</span>}
                </div>
                <div class="item-actions">
                  <button
                    type="button"
                    class="icon-btn"
                    aria-label={`Edit ${r.header}`}
                    title="Edit"
                    onClick={() => setEditingId(r.id)}
                  >
                    <PencilIcon />
                  </button>
                  <button
                    type="button"
                    class="icon-btn"
                    aria-label={`Remove ${r.header}`}
                    title="Remove"
                    onClick={() =>
                      updateWithUndo(`Removed “${r.header}”`, (root, now) => ops.deleteResource(root, target, r.id, now))
                    }
                  >
                    <CrossIcon />
                  </button>
                </div>
              </li>
            ),
          )}
        </ul>
      )}

      {adding ? (
        <ResourceForm
          onSubmit={(input) => {
            const id = newId();
            update((root, now) => ops.addResource(root, target, id, input, now));
          }}
          onClose={() => setAdding(false)}
        />
      ) : (
        <button type="button" class="add-input add-trigger" onClick={() => setAdding(true)}>
          <span class="plus" aria-hidden="true">
            +
          </span>
          Add a resource…
        </button>
      )}
    </div>
  );
}

/**
 * Link, title and an optional note, with Cancel and Add. Enter submits and
 * Escape cancels. While the title is empty, its placeholder shows the title
 * the link will get. Pasting "Title https://…" into the link splits it.
 * Adding keeps the form open for the next one; editing closes on Save.
 */
function ResourceForm(props: { initial?: Resource; onSubmit: (input: ops.ResourceInput) => void; onClose: () => void }) {
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
      class="res-form"
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
      <div class="res-fields">
        <label class="res-field res-link" for={`${uid}-link`}>
          <span class="res-label">Link</span>
          <input
            id={`${uid}-link`}
            ref={linkRef}
            type="text"
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
        <label class="res-field" for={`${uid}-title`}>
          <span class="res-label">Title</span>
          <input
            id={`${uid}-title`}
            type="text"
            value={header}
            onInput={(e) => setHeader(e.currentTarget.value)}
            placeholder={derivedTitle || 'What is this document?'}
            aria-label="Resource title"
            autoComplete="off"
          />
        </label>
        <label class="res-field res-note-field" for={`${uid}-note`}>
          <span class="res-label">
            Note <span class="res-optional">optional</span>
          </span>
          <input
            id={`${uid}-note`}
            type="text"
            value={note}
            onInput={(e) => setNote(e.currentTarget.value)}
            placeholder="Why it matters, or where to look"
            aria-label="Resource note"
            autoComplete="off"
          />
        </label>
      </div>
      <div class="res-form-foot">
        {bad && (
          <p class="res-error" id={`${uid}-error`} role="alert">
            Add a link, like docs.example.com/page.
          </p>
        )}
        <div class="res-form-actions">
          <button type="button" class="btn quiet small" onClick={close}>
            Cancel
          </button>
          <button type="submit" class="btn primary small">
            {editing ? 'Save' : 'Add resource'}
          </button>
        </div>
      </div>
    </form>
  );
}
