import { useState } from 'preact/hooks';
import { isProjectDone } from '../../../core/completion';
import { daysUntil, dueDistance } from '../../../core/due';
import { deleteEntry, moveEntryToProject, toggleEntry } from '../../actions';
import { entrySpan, itemKey, type EventDue } from '../../components/dueItem';
import { ChevronIcon } from '../../components/icons';
import { useLoadFormat } from '../../components/useUnit';
import { useStore } from '../../store';
import { EntryForm } from './EntryForm';

/**
 * An event in the day panel: ticked done from its checkbox, and opening to
 * its time, allocation, notes and quick actions, including moving it into a
 * project as a task.
 */
export function EventItem({ item, now, startOpen }: { item: EventDue; now: Date; startOpen: boolean }) {
  const { root } = useStore();
  const [open, setOpen] = useState(startOpen);
  const [editing, setEditing] = useState(false);
  const fmtLoad = useLoadFormat();
  const e = item.entry;
  const status = e.done ? 'Done' : item.watch ? dueDistance(daysUntil(e.until ?? e.date, now)) : e.time;
  const detailId = `day-item-${itemKey(item)}`;
  const projects = root.projects.filter((p) => !p.archived && !isProjectDone(p));

  if (editing) {
    return (
      <li class="border-b border-line px-24 py-14">
        <EntryForm date={e.date} entry={e} now={now} onClose={() => setEditing(false)} />
      </li>
    );
  }

  return (
    <li class="border-b border-line">
      <div class="flex min-h-68 items-center gap-12 py-12 pr-18 pl-24">
        <input type="checkbox" checked={e.done} aria-label={`“${e.title}” done`} onChange={() => toggleEntry(e)} />
        <button
          type="button"
          class="flex min-w-0 flex-1 cursor-pointer items-center gap-12 bg-transparent text-left"
          aria-expanded={open}
          aria-controls={detailId}
          onClick={() => setOpen(!open)}
        >
          <span class="grid min-w-0 flex-1 grid-cols-1 gap-1">
            <span class={`truncate font-medium ${e.done ? 'text-faint line-through' : 'text-ink'}`} title={e.title}>
              {e.title}
            </span>
            <span class="truncate text-13 text-body">
              {e.time ? `${e.time} · ` : ''}Event, no project{e.until ? ` · ${entrySpan(e)}` : ''}
            </span>
          </span>
          {status && <span class={`pill ${item.watch ? 'pill-watch' : 'pill-low'}`}>{status}</span>}
          <span class={`inline-flex text-body transition-transform ${open ? 'rotate-180' : ''}`}>
            <ChevronIcon dir="down" />
          </span>
        </button>
      </div>
      {open && (
        <div id={detailId} class="grid grid-cols-1 gap-12 px-24 pb-18">
          {(e.time || e.effort !== undefined || e.until) && (
            <div class="flex flex-wrap gap-6">
              {e.time && <span class="pill pill-plain">{e.time}</span>}
              {e.until && <span class="pill pill-plain">{entrySpan(e)}</span>}
              {e.effort !== undefined && <span class="pill pill-plain">{fmtLoad(e.effort)} allocation</span>}
            </div>
          )}
          {e.notes && <p class="rounded-10 bg-page px-14 py-10 text-14 whitespace-pre-wrap text-ink">{e.notes}</p>}
          <div class="flex flex-wrap gap-6">
            <button type="button" class="btn btn-small" onClick={() => toggleEntry(e)}>
              {e.done ? 'Reopen' : 'Mark done'}
            </button>
            {projects.length > 0 && (
              <select
                class="min-h-30 cursor-pointer rounded-10 border border-line bg-card px-10 text-13 font-medium text-ink hover:border-accent max-lg:min-h-44 max-lg:text-16"
                aria-label={`Move “${e.title}” into a project`}
                value=""
                onChange={(ev) => {
                  const p = projects.find((x) => x.id === ev.currentTarget.value);
                  if (p) moveEntryToProject(e, p);
                }}
              >
                <option value="">Move to a project…</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}
            <button type="button" class="btn btn-quiet btn-small" onClick={() => setEditing(true)}>
              Change
            </button>
            <button type="button" class="btn btn-quiet btn-small btn-danger" onClick={() => deleteEntry(e)}>
              Delete
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
