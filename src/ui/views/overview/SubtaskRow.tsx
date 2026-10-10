import { useState } from 'preact/hooks';
import * as ops from '../../../core/ops';
import type { Project, Subtask, Task } from '../../../core/schema';
import { CrossIcon, PencilIcon } from '../../components/icons';
import { update, updateWithUndo } from '../../store';
import { controlledCheck } from './controlledCheck';
import { DueDate } from './DueDate';
import { InlineInput } from './InlineInput';
import { RowAction, RowActions } from './RowActions';

/** group/row: an empty deadline button brightens while the row is hovered. */
const ROW = 'group/row flex min-h-38 items-center gap-8 max-lg:min-h-44';

export function SubtaskRow({ project, task, subtask, now }: { project: Project; task: Task; subtask: Subtask; now: Date }) {
  const [editing, setEditing] = useState(false);
  const cbId = `sub-${subtask.id}`;

  if (editing) {
    return (
      <li class={ROW}>
        <InlineInput
          value={subtask.title}
          label="Sub-task title"
          onCancel={() => setEditing(false)}
          onSave={(title) => {
            setEditing(false);
            update((r, n) => ops.renameSubtask(r, project.id, task.id, subtask.id, title, n));
          }}
        />
      </li>
    );
  }

  return (
    <li class={ROW}>
      <label
        class={`flex min-w-0 flex-1 cursor-pointer items-center gap-12 ${subtask.done ? 'text-faint' : 'text-ink'}`}
        for={cbId}
      >
        <input
          id={cbId}
          type="checkbox"
          checked={subtask.done}
          onChange={controlledCheck(subtask.done, (want) =>
            update((r, n) => ops.setSubtaskDone(r, project.id, task.id, subtask.id, want, n)),
          )}
        />
        {subtask.title}
      </label>
      <DueDate
        value={subtask.due}
        done={subtask.done}
        now={now}
        of={subtask.title}
        onChange={(due) => update((r, n) => ops.setSubtaskDue(r, project.id, task.id, subtask.id, due, n))}
      />
      <RowActions>
        <RowAction label={`Edit “${subtask.title}”`} title="Edit" onClick={() => setEditing(true)}>
          <PencilIcon />
        </RowAction>
        <RowAction
          label={`Delete “${subtask.title}”`}
          title="Delete"
          onClick={() =>
            updateWithUndo(`Deleted “${subtask.title}”`, (r, n) => ops.deleteSubtask(r, project.id, task.id, subtask.id, n))
          }
        >
          <CrossIcon />
        </RowAction>
      </RowActions>
    </li>
  );
}
