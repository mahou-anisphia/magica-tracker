import { useState } from 'preact/hooks';
import * as ops from '../../../core/ops';
import type { BacklogItem, Project } from '../../../core/schema';
import { deleteBacklogItem, promote } from '../../actions';
import { TrashIcon } from '../../components/icons';
import { update } from '../../store';
import { Select } from '../../components/Select';
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
            <Select
              label={`Project to promote “${item.title}” into`}
              size="small"
              class="max-w-200"
              value={targetProject.id}
              options={projects.map((p) => ({ value: p.id, label: p.name }))}
              onChange={setTarget}
            />
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
