import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { shortDay } from '../../core/format';
import type { Root } from '../../core/schema';
import type { Team } from '../../core/team';
import { exportNow, openProject, viewAs } from '../actions';
import { SearchIcon } from '../components/icons';
import { getState, go, set, setTheme } from '../store';
import { THEMES } from '../themes';
import { orbSections } from './orbMenu';
import { shortcutLabel } from './shortcut';

type Entry = { group: string; label: string; hint: string; run: () => void };

/** Everything the palette can reach, most useful groups first. */
function entries(root: Root, team: Team): Entry[] {
  const out: Entry[] = [
    { group: 'Places', label: 'Overview', hint: 'Your tracker', run: () => go('overview') },
    { group: 'Places', label: 'Timeline', hint: 'Deadlines by month', run: () => go('timeline') },
  ];
  for (const s of orbSections()) {
    out.push({ group: 'Places', label: s.label, hint: s.actions.map((a) => a.label).join(', '), run: s.open });
  }
  for (const s of orbSections()) {
    for (const a of s.actions) out.push({ group: 'Actions', label: a.label, hint: s.label, run: a.run });
  }
  out.push({ group: 'Actions', label: 'Export', hint: 'Download a backup file', run: exportNow });
  for (const t of THEMES) {
    out.push({
      group: 'Actions',
      label: `Theme: ${t.name}`,
      hint: 'Appearance',
      run: () => setTheme({ ...getState().theme, theme: t.id }),
    });
  }
  for (const m of team.members) {
    if (!m.snapshot) continue;
    out.push({ group: 'People', label: `View as ${m.name}`, hint: `Their file from ${shortDay(m.snapshot.exportedAt)}`, run: () => viewAs(m.id) });
  }
  for (const p of root.projects) {
    if (p.archived) continue;
    out.push({ group: 'Projects', label: p.name, hint: 'Project', run: () => openProject(p.id) });
  }
  for (const p of root.projects) {
    if (p.archived) continue;
    for (const t of p.tasks) {
      if (!t.done) out.push({ group: 'Tasks', label: t.title, hint: p.name, run: () => openProject(p.id, t.id) });
    }
  }
  return out;
}

const LIMIT = 40;

/**
 * ⌘K on Mac, Ctrl+K elsewhere, or the orb's search button: jump to a place,
 * run an orb action, or open a project or task by typing part of its name.
 */
export function CommandPalette(props: { open: boolean; root: Root; team: Team }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (props.open && !d.open) {
      setQuery('');
      setIndex(0);
      d.showModal();
    }
    if (!props.open && d.open) d.close();
  }, [props.open]);

  const all = useMemo(() => (props.open ? entries(props.root, props.team) : []), [props.open, props.root, props.team]);
  const q = query.trim().toLowerCase();
  const hits = (q ? all.filter((e) => e.label.toLowerCase().includes(q) || e.hint.toLowerCase().includes(q)) : all).slice(0, LIMIT);
  const active = Math.min(index, Math.max(hits.length - 1, 0));

  const close = () => set({ palette: false });
  const run = (e: Entry | undefined) => {
    if (!e) return;
    close();
    e.run();
  };

  let lastGroup = '';
  return (
    <dialog
      ref={dialog}
      aria-label="Go to"
      class="mx-auto mt-[12vh] w-[min(560px,calc(100vw-32px))] overflow-hidden rounded-18 border border-line bg-card p-0 text-ink shadow-dialog backdrop:bg-scrim backdrop:backdrop-blur-[3px]"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      {props.open && (
        <>
          <label class="flex items-center gap-10 border-b border-line px-18 py-12 text-body">
            <SearchIcon size={16} />
            <span class="sr-only">Go to</span>
            <input
              type="text"
              autoFocus
              value={query}
              placeholder="Go to a place, an action, a project or a task…"
              class="min-h-34 min-w-0 flex-1 bg-transparent text-16 text-ink outline-none placeholder:text-faint"
              role="combobox"
              aria-expanded="true"
              aria-controls="palette-list"
              aria-activedescendant={hits.length ? `palette-${active}` : undefined}
              onInput={(e) => {
                setQuery(e.currentTarget.value);
                setIndex(0);
              }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setIndex((active + 1) % Math.max(hits.length, 1));
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setIndex((active - 1 + hits.length) % Math.max(hits.length, 1));
                } else if (e.key === 'Enter') {
                  e.preventDefault();
                  run(hits[active]);
                }
              }}
            />
            <kbd class="rounded-7 border border-line bg-page px-6 text-12 font-medium text-body">Esc</kbd>
          </label>
          <ul id="palette-list" role="listbox" aria-label="Results" class="max-h-[min(420px,60vh)] overflow-y-auto p-8">
            {hits.map((e, i) => {
              const heading = e.group !== lastGroup ? e.group : null;
              lastGroup = e.group;
              return (
                <li key={`${e.group}-${e.label}-${i}`} role="presentation">
                  {heading && <div class="px-10 pt-8 pb-4 text-12 font-medium text-body">{heading}</div>}
                  <div
                    id={`palette-${i}`}
                    role="option"
                    aria-selected={i === active}
                    class={`flex min-h-42 cursor-pointer items-center gap-12 rounded-10 px-10 py-6 ${i === active ? 'bg-primary-tint' : ''}`}
                    onMouseMove={() => setIndex(i)}
                    onClick={() => run(e)}
                  >
                    <span class="min-w-0 flex-1 truncate font-medium">{e.label}</span>
                    <span class="max-w-[45%] truncate text-12 text-body">{e.hint}</span>
                  </div>
                </li>
              );
            })}
            {hits.length === 0 && <li class="px-10 py-14 text-14 text-body">Nothing matches “{query}”.</li>}
          </ul>
          <div class="flex gap-16 border-t border-line bg-page px-18 py-10 text-12 text-body">
            <span>↑↓ to move</span>
            <span>Enter to open</span>
            <span class="ml-auto">{shortcutLabel()} opens this anywhere</span>
          </div>
        </>
      )}
    </dialog>
  );
}
