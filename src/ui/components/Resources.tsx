import { useEffect, useRef, useState } from 'preact/hooks';
import { newId } from '../../core/id';
import * as ops from '../../core/ops';
import type { Resource } from '../../core/schema';
import { headerFromUrl, normalizeUrlInput, parseResourceInput, shortUrl } from '../../core/url';
import { update, updateWithUndo } from '../store';

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
              <li key={r.id}>
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
                  </a>
                  <span class="res-url">{shortUrl(r.url)}</span>
                  {r.note && <span class="res-note">{r.note}</span>}
                </div>
                <div class="row-actions">
                  <button type="button" class="icon-btn" aria-label={`Edit ${r.header}`} onClick={() => setEditingId(r.id)}>
                    Edit
                  </button>
                  <button
                    type="button"
                    class="icon-btn"
                    aria-label={`Remove ${r.header}`}
                    onClick={() =>
                      updateWithUndo(`Removed “${r.header}”`, (root, now) => ops.deleteResource(root, target, r.id, now))
                    }
                  >
                    ×
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
 * Title, link and an optional note. Enter saves; Escape closes.
 * Adding: the form clears and stays open for the next one, and closes when you
 * leave it empty. Editing: leaving saves if valid, otherwise cancels.
 * A pasted "Title https://…" in the title field is split for you, and a link
 * with no title gets one from its path.
 */
function ResourceForm(props: { initial?: Resource; onSubmit: (input: ops.ResourceInput) => void; onClose: () => void }) {
  const editing = !!props.initial;
  const [header, setHeader] = useState(props.initial?.header ?? '');
  const [url, setUrl] = useState(props.initial?.url ?? '');
  const [note, setNote] = useState(props.initial?.note ?? '');
  const [bad, setBad] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const closed = useRef(false);

  // autoFocus only applies on page load, not to fields rendered later.
  useEffect(() => titleRef.current?.focus(), []);

  const resolve = (): ops.ResourceInput | null => {
    if (!url.trim()) {
      const parsed = parseResourceInput(header);
      return parsed ? { ...parsed, note } : null;
    }
    const u = normalizeUrlInput(url);
    if (!u) return null;
    return { header: header.trim() || headerFromUrl(u), url: u, note };
  };

  const close = () => {
    if (closed.current) return;
    closed.current = true;
    props.onClose();
  };

  const submit = (e?: Event) => {
    e?.preventDefault();
    const input = resolve();
    if (!input) {
      setBad(true);
      return;
    }
    props.onSubmit(input);
    if (editing) {
      closed.current = true;
      return;
    }
    setHeader('');
    setUrl('');
    setNote('');
    setBad(false);
    titleRef.current?.focus();
  };

  const empty = !header.trim() && !url.trim() && !note.trim();

  return (
    <form
      class="add-input resource-form"
      noValidate
      onSubmit={submit}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          close();
        }
      }}
      onFocusOut={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
        if (editing) {
          const input = resolve();
          if (input) props.onSubmit(input);
          close();
        } else if (empty) {
          close();
        }
      }}
    >
      <input
        ref={titleRef}
        type="text"
        value={header}
        onInput={(e) => {
          setHeader(e.currentTarget.value);
          setBad(false);
        }}
        placeholder="Title"
        aria-label="Resource title"
        autoComplete="off"
      />
      <input
        type="text"
        value={url}
        onInput={(e) => {
          setUrl(e.currentTarget.value);
          setBad(false);
        }}
        placeholder="Link"
        aria-label="Resource link"
        aria-invalid={bad || undefined}
        inputMode="url"
        autoComplete="off"
        autoCapitalize="off"
        spellcheck={false}
      />
      <input
        type="text"
        value={note}
        onInput={(e) => setNote(e.currentTarget.value)}
        placeholder="Note (optional)"
        aria-label="Resource note"
        autoComplete="off"
      />
      <div class="resource-form-actions">
        {bad && (
          <span class="hint" role="alert">
            needs a link
          </span>
        )}
        <button type="submit" class="btn small primary">
          {editing ? 'Save' : 'Add'}
        </button>
      </div>
    </form>
  );
}
