# Magica Tracker

A calm, single-page tracker for projects, their tasks and sub-tasks, linked resources, and a backlog. Everything lives in the browser's `localStorage`. There is no server and no account. Export and Import are the backup.

## Using it

Open `dist/index.html`. It works straight from disk (`file://`) or behind any static server, such as Caddy on the homelab. It makes no network requests.

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
- **Quiet by default.** No empty-state sentences. The Needs attention panel is hidden when nothing qualifies. The theme carries the calm.
- **Deadlines** (`due`, a calendar day like `"2026-10-03"`) are optional on projects, tasks and sub-tasks. They are set with the browser's own date picker and compared in local time. A deadline is *approaching* when it is 3 days out or closer (`DUE_SOON_DAYS`, fixed). Approaching and overdue deadlines turn amber and appear in Needs attention. A task listed there for its deadline isn't listed again as stale. A project counts as finished for its deadline when it has tasks and all are done.
- **Resources** are added through a small form (title, link, optional note) that opens from the dashed "Add a resource…" row. A link with no title gets one from its path. Pasting "Title https://…" into the title field is split for you.
- **Long text** wraps or truncates with "…" (the full text shows on hover). Every single-column grid uses `minmax(0, 1fr)`, so nothing pushes the layout apart.
- **View mode** (Overview/Timeline) is remembered per browser under `magica:v1:mode`. It isn't part of the data or its exports.
- **`BacklogItem.updatedAt`** (optional) was added so a merge import can tell which copy of an edited backlog item is newer. Files without it still import; merge falls back to `createdAt`.
- **Unsafe URL schemes** (`javascript:`, `data:`, `vbscript:`, `blob:`) are rejected on save and on import. Bare hosts like `docs.example.com/x` get `https://` added.
- **Ids** use `crypto.randomUUID()` where available. Over plain http on a LAN it isn't, so ids fall back to `crypto.getRandomValues`.
- **Contrast.** Steel (#7A9AB5) is 2.7:1 on Mist and 2.4:1 on Frost. It is used only for metadata and done items on Mist. Inside Frost panels, secondary text uses Slate (4.6:1). Burnished text is too faint (2.6:1), so "worth watching" is a Gold pill with Deep text (7.4:1), with Burnished for the dot only.
- **Small deletions** (sub-tasks, resources, backlog items) happen at once with an Undo toast. Deleting a project or task, unticking a parent, and demoting a task that loses sub-tasks or resources all ask first.
