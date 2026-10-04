# Magica Tracker

A calm, single-page tracker for projects, their tasks and sub-tasks, linked resources, and a backlog. Everything lives in the browser's `localStorage`. There is no server and no account. Export and Import are the backup.

## Using it

Open `dist/index.html`. It works straight from disk (`file://`) or behind any static server, such as Caddy on the homelab. It makes no network requests.

**Load sample data** (top left) fills the tracker with magic-themed projects, tasks, deadlines and backlog ideas, dated around today, so you can see how it looks when lived in. **Wipe sample data** removes them again. Every sample id starts with `sample-`, so your own projects and tasks are never touched, even when they sit side by side.

The top bar switches between **Overview** (projects, tasks, backlog) and **Timeline** (a month calendar of deadlines, with today circled). Clicking an item on the Timeline opens it in Overview.

| Key | Does |
|---|---|
| `n` | Focus "Add a task" in the current project |
| `b` | Capture an idea into the backlog |
| `t` | Switch between Overview and Timeline |
| `Space` | Toggle the focused task |
| `/` | Focus the project filter |
| `Esc` | Close whatever is expanded |

## Developing

```sh
pnpm install     # also points git at .githooks/
pnpm dev         # Vite dev server
pnpm test        # Vitest specs for src/core
pnpm build       # writes dist/index.html
pnpm check       # typecheck + tests + build + fail if dist/ is out of date
```

**`dist/` is committed.** It is the product. Run `pnpm build` before committing changes to `src/`. The pre-commit hook rebuilds and refuses the commit if `dist/index.html` changed. Never edit `dist/index.html` by hand.

## Layout

```
src/core/      pure rules, no DOM: schema (Valibot), completion, staleness,
               merge, migrate, validation, ops, url/time helpers
src/storage/   localStorage adapter: load, debounced save, cross-tab sync
src/ui/        Preact components, store (commit()), tokens.css, app.css
tests/         Vitest specs for src/core
```

Every change goes through `commit()` in `src/ui/store.ts`. It applies the completion rule, re-renders, and saves after 300 ms.

## Decisions beyond the original plan

- **Date, not a greeting.** Overview's heading is today's date. Timeline's heading is the month. Export and Import sit in the top bar next to the view switch.
- **Quiet by default.** No empty-state sentences. The Needs attention panel is hidden when nothing qualifies, and shows only the 3 most pressing items until you ask for more ("Show N more"). The theme carries the calm.
- **Look.** Inter (bundled, Latin subset, 48 KB) in white cards on Mist. The top bar and page structure are unchanged from the first design. Under the date ("Sunday, 4 Oct"; the Timeline heading reads "October, 2026"), an "At a glance" board: four numbers (open tasks, in progress, urgent tasks, overdue) divided by hairlines, with the allocation bar along its bottom. Only urgent and overdue carry a colour, and only when they aren't zero. Boards are spaced generously, with quiet labels above them.
- **Deadlines** (`due`, a calendar day like `"2026-10-03"`) are optional on projects, tasks and sub-tasks. They are set with a small themed calendar (a popover: arrow keys move by day and week, Page Up/Down by month, with Today and Clear) and compared in local time. A deadline is *approaching* when it is 3 days out or closer (`DUE_SOON_DAYS`, fixed). Approaching and overdue deadlines turn amber and appear in Needs attention. A task listed there for its deadline isn't listed again as urgent or stale. Overdue shows as a count of days ("3d overdue"). In the Timeline, clicking a day opens it in a side panel with details and quick actions.
- **Priority** is optional on tasks: low, medium, high or urgent. Open tasks are ordered by priority, then nearest deadline, then the order added. Open urgent tasks appear in Needs attention.
- **Allocation** is optional on tasks: a whole percent of your capacity (stored as `effort`). It is one shared number, not per project: every open task in an active project adds into the Allocation bar on the Overview, scaled 0–200%. Up to 100% fills in Iris; overload past 100% fills in amber. Finishing a task, or marking its project done, frees its share.
- **Projects can be marked done.** A done project leaves Needs attention and the numbers, its deadline stops counting, and it moves to "Completed" in the sidebar. Its tasks are left as they are. Reopen it any time.
- **Notes** sit at the top of an open task.
- **Resources** are added through a small form (title, link, optional note) that opens from the dashed "Add a resource…" row. A link with no title gets one from its path. Pasting "Title https://…" into the title field is split for you.
- **Long text** wraps or truncates with "…" (the full text shows on hover). Every single-column grid uses `minmax(0, 1fr)`, so nothing pushes the layout apart.
- **View mode** (Overview/Timeline) is remembered per browser under `magica:v1:mode`. It isn't part of the data or its exports.
- **Schema version 2.** Version 2 only added optional fields: deadlines, priority, effort, project `doneAt`, and backlog `updatedAt` (so a merge can tell which copy of an edited backlog item is newer). Every v1 file and v1 browser storage loads as-is through `MIGRATIONS[1]` and is saved back as v2 on the next change. The version bump means an older build refuses a v2 file instead of silently dropping fields it doesn't know. The storage key stays `magica:v1`: it names the storage slot, not the schema.
- **Unsafe URL schemes** (`javascript:`, `data:`, `vbscript:`, `blob:`) are rejected on save and on import. Bare hosts like `docs.example.com/x` get `https://` added.
- **Ids** use `crypto.randomUUID()` where available. Over plain http on a LAN it isn't, so ids fall back to `crypto.getRandomValues`.
- **Contrast.** Steel (#7A9AB5) is 2.7:1 on Mist and 2.4:1 on Frost. It is used only for metadata and done items on Mist. Inside Frost panels, secondary text uses Slate (4.6:1). Burnished text is too faint (2.6:1), so "worth watching" is a Gold pill with Deep text (7.4:1), with Burnished for the dot only.
- **Small deletions** (sub-tasks, resources, backlog items) happen at once with an Undo toast. Deleting a project or task, unticking a parent, and demoting a task that loses sub-tasks or resources all ask first.
