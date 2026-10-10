import { useState } from 'preact/hooks';
import * as ops from '../../../core/ops';
import type { BacklogItem, Project } from '../../../core/schema';
import { deleteBacklogItem, promote } from '../../actions';
import { TrashIcon } from '../../components/icons';
import { update } from '../../store';
import { EditableText } from './EditableText';
import { RowAction, RowActions } from './RowActions';

/** One idea: its title and notes, editable in place, and a way into a project. */
export function BacklogRow(props: { item: BacklogItem; projects: Project[] }) {
  const { item, projects } = props;
  const suggested = projects.some((p) => p.id === item.suggestedProjectId) ? item.suggestedProjectId : undefined;
  const [target, setTarget] = useState(suggested ?? projects[0]?.id ?? '');
  const targetProject = projects.find((p) => p.id === target) ?? projects[0];

  return (
    <li class="grid grid-cols-1 gap-4 px-18 py-14">
      <EditableText
        class="font-medium text-ink"
        value={item.title}
        label="Title"
        required
        onSave={(t) => update((r, n) => ops.renameBacklogItem(r, item.id, t, n))}
      />
      <EditableText
        class="text-14"
        value={item.notes ?? ''}
        label="Notes"
        placeholder="Notes…"
        multiline
        onSave={(notes) => update((r, n) => ops.setBacklogNotes(r, item.id, notes, n))}
      />
      <div class="mt-4 flex flex-wrap items-center justify-end gap-x-10 gap-y-6">
        {targetProject && (
          <div class="mr-auto flex items-center gap-6">
            <select
              class="min-h-30 max-w-200 rounded-8 border border-line bg-card px-10 py-2 text-13 text-ink max-lg:min-h-44 max-lg:text-16"
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
            <button type="button" class="btn btn-small" onClick={() => promote(item.id, targetProject)}>
              Promote →
            </button>
          </div>
        )}
        <RowActions>
          <RowAction label={`Delete “${item.title}”`} title="Delete" onClick={() => deleteBacklogItem(item.id, item.title)}>
            <TrashIcon />
          </RowAction>
        </RowActions>
      </div>
    </li>
  );
}
