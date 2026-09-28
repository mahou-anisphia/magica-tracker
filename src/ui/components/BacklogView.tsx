import { useState } from 'preact/hooks';
import * as ops from '../../core/ops';
import type { BacklogItem, Project, Root } from '../../core/schema';
import { addBacklogItem, deleteBacklogItem, promote } from '../actions';
import { update } from '../store';
import { AddInput, EditableText } from './inputs';

export function BacklogView(props: { root: Root }) {
  const { root } = props;
  const projects = root.projects.filter((p) => !p.archived);

  return (
    <article aria-labelledby="pane-title">
      <header class="pane-head">
        <h2 id="pane-title" class="pane-title">
          Backlog
        </h2>
      </header>

      <AddInput placeholder="Capture an idea…" label="Add to backlog" shortcut="new-backlog" onAdd={addBacklogItem} />

      {root.backlog.length > 0 && (
        <ul class="backlog-list">
          {[...root.backlog].reverse().map((item) => (
            <BacklogRow key={item.id} item={item} projects={projects} />
          ))}
        </ul>
      )}
    </article>
  );
}

function BacklogRow(props: { item: BacklogItem; projects: Project[] }) {
  const { item, projects } = props;
  const suggested = projects.some((p) => p.id === item.suggestedProjectId) ? item.suggestedProjectId : undefined;
  const [target, setTarget] = useState(suggested ?? projects[0]?.id ?? '');
  const targetProject = projects.find((p) => p.id === target) ?? projects[0];

  return (
    <li class="backlog-item">
      <EditableText
        class="item-title"
        value={item.title}
        label="Title"
        required
        onSave={(t) => update((r, n) => ops.renameBacklogItem(r, item.id, t, n))}
      />
      <EditableText
        class="item-notes"
        value={item.notes ?? ''}
        label="Notes"
        placeholder="Notes…"
        multiline
        onSave={(notes) => update((r, n) => ops.setBacklogNotes(r, item.id, notes, n))}
      />
      <div class="backlog-foot">
        {targetProject && (
          <div class="promote">
            <select
              aria-label={`Project to promote “${item.title}” into`}
              value={targetProject.id}
              onChange={(e) => setTarget(e.currentTarget.value)}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <button type="button" class="btn small" onClick={() => promote(item.id, targetProject)}>
              Promote →
            </button>
          </div>
        )}
        <div class="row-actions">
          <button
            type="button"
            class="icon-btn"
            aria-label={`Delete “${item.title}”`}
            onClick={() => deleteBacklogItem(item.id, item.title)}
          >
            Delete
          </button>
        </div>
      </div>
    </li>
  );
}
