import { useState } from 'preact/hooks';
import { hasOpenTasks } from '../../core/attention';
import type { Project, Root } from '../../core/schema';
import { createProject, openBacklog, openProject } from '../actions';
import type { View } from '../store';
import { AddInput } from './inputs';

export function Sidebar(props: { root: Root; view: View; open: boolean }) {
  const { root, view } = props;
  const [filter, setFilter] = useState('');
  const [adding, setAdding] = useState(false);

  const q = filter.trim().toLowerCase();
  const matches = (p: Project) => !q || p.name.toLowerCase().includes(q);
  const active = root.projects.filter((p) => !p.archived);
  const archived = root.projects.filter((p) => p.archived);
  const shown = active.filter(matches);
  const shownArchived = archived.filter(matches);

  const item = (p: Project) => {
    const current = view.kind === 'project' && view.id === p.id;
    const open = hasOpenTasks(p);
    return (
      <li key={p.id}>
        <button
          type="button"
          class="nav-item"
          aria-current={current ? 'page' : undefined}
          onClick={() => openProject(p.id)}
        >
          <span class={`dot ${open ? 'open' : ''}`} title={open ? 'Has open tasks' : 'Nothing open'} />
          <span class="label" title={p.name}>
            {p.name}
          </span>
          <span class="sr-only">{open ? '(has open tasks)' : '(nothing open)'}</span>
        </button>
      </li>
    );
  };

  return (
    <nav id="sidebar" class={`sidebar ${props.open ? 'open' : ''}`} aria-label="Projects and backlog">
      <h2 class="eyebrow">Projects</h2>
      {root.projects.length > 0 && (
        <input
          type="search"
          class="filter"
          placeholder="Filter projects   /"
          aria-label="Filter projects"
          data-shortcut="filter"
          value={filter}
          onInput={(e) => setFilter(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.stopPropagation();
              setFilter('');
              e.currentTarget.blur();
            } else if (e.key === 'Enter' && shown[0]) {
              openProject(shown[0].id);
            }
          }}
        />
      )}
      <ul class="nav-list">{shown.map(item)}</ul>

      {adding ? (
        <AddInput
          placeholder="Project name"
          label="New project name"
          onAdd={(name) => {
            createProject(name);
            setAdding(false);
          }}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <button
          type="button"
          class="btn quiet small"
          style={{ justifySelf: 'start' }}
          onClick={() => {
            setAdding(true);
            requestAnimationFrame(() => document.querySelector<HTMLInputElement>('#sidebar .add-input input')?.focus());
          }}
        >
          + project
        </button>
      )}

      <hr />

      <ul class="nav-list">
        <li>
          <button
            type="button"
            class="nav-item"
            aria-current={view.kind === 'backlog' ? 'page' : undefined}
            onClick={openBacklog}
          >
            <span class="label">Backlog</span>
            <span class="count">{root.backlog.length}</span>
          </button>
        </li>
      </ul>

      {shownArchived.length > 0 && (
        <details class="archived-group" open={!!q}>
          <summary>Archived ({shownArchived.length})</summary>
          <ul class="nav-list">{shownArchived.map(item)}</ul>
        </details>
      )}
    </nav>
  );
}
