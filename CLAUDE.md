# CLAUDE.md

Working notes for this repo: how the UI code is organised and why. Product
decisions (what the app does and looks like) live in `README.md`.

## Commands

```sh
pnpm install     # also points git at .githooks/
pnpm dev         # Vite dev server
pnpm typecheck
pnpm test        # Vitest specs for src/core
pnpm build       # writes dist/index.html (committed; the pre-commit hook enforces it)
pnpm check       # all of the above + fail if dist/ is out of date
```

`dist/index.html` is the shipped product and is committed. Rebuild before every
commit that touches `src/`, and never edit `dist/` by hand.

## Layout of `src/ui`

```
src/ui/
  App.tsx            the shell around every view: keyboard shortcuts (⌘K/Ctrl+K), the clock, view switch
  store.ts           state + commit(); actions.ts: everything that changes it
  styles.css         Tailwind entry: theme tokens, element defaults, shared primitives
  themes.css         one block of colour-role values per palette (themes)
  themes.ts          the theme list, the saved choice, and putting the palette on <html>
  components/        GLOBAL: only components used by more than one view (or a view and the shell)
    icons.tsx  Modal.tsx  PriorityChip.tsx  AllocationBar.tsx  Avatar.tsx
    Panel.tsx  ViewHeader.tsx  BackLink.tsx  highlight.tsx
    MonthCalendar.tsx  CalendarItem.tsx  dueItem.ts   (your Timeline and View as)
  shell/             app frame rendered once by App: top bar (everyday views only), banners,
                     dialogs, toast, the orb (Orb.tsx, orbMenu.tsx) and the search palette
  views/
    overview/        the Overview page: OverviewView.tsx + every component only it uses
    timeline/        the Timeline page: TimelineView.tsx + every component only it uses
    settings/        Settings (theme, allocation, your name, storage)
    team/            Team: members, adding one at a time, importing their files
    member/          View as: one member's tracker, read-only (MemberView.tsx)
    observatory/     the leader's view across the team
```

### Decisions

1. **Group by folder: one folder per view.** Each page lives in `views/<name>/`,
   with `<Name>View.tsx` as its entry. App only imports the entry.
2. **Local first, global only when shared.** A component used by a single view
   lives in that view's folder, even if it is generic (e.g. `DueDate`,
   `DatePicker`, `AddInput` are Overview-only today, so they sit in
   `views/overview/`). `components/` is strictly for components used across
   views. When a local component starts being used by a second view, move it to
   `components/` in the same change, and move it back if that stops being true.
3. **The shell is not a view.** Top bar, banners, the confirm/capture/import
   dialogs and the toast are rendered once by `App` around whichever view is
   showing, so they live in `shell/`, not in `components/`. The top bar is the
   everyday views' frame: `App` shows it on Overview and Timeline only.
4. **One component per file**, the file named after the component. Small
   non-component helpers shared within a folder get their own file too
   (`controlledCheck.ts`, `timeline/dueItem.ts`).
5. **Imports go down or sideways, never across views.** A view may import from
   `components/`, `store`, `actions` and `src/core`, but never from another
   view's folder. If it needs to, the thing belongs in `components/`.
6. **Everyday views vs. orb screens.** Overview and Timeline are the top bar's
   switch and are remembered (`setMode`). Settings, Team, Observatory and View
   as are reached with `go(mode, highlight?)` from the orb or the palette, and
   start with `ViewHeader` (the "Your tracker" back link, a title, a line).
   They have no top bar, and the view-switching keys (`t`, `/`) do nothing
   there: a switch that sends you home from inside a screen is confusing.
7. **Orb actions point at what to use.** Every orb section and action is
   declared once in `shell/orbMenu.tsx`; the palette lists the same ones. An
   action calls `go(mode, { key, hint })`. The target gives itself away with
   `useHighlight(key)`: spread `attrs` on it, add `ring` to its class and
   render `<HintTag text={hint} />` inside (it must be `relative`). `Panel`
   does this for whole cards via its `highlight` prop. The ring pulses and
   clears after 3.6 s. Add an action by adding both halves.
8. **Your data and the team never mix.** `root` (yours, exported) and `team`
   (others' files, read-only) are separate records and separate store fields.
   Team changes go through `setTeam()`, which saves at once; nothing in a
   member's snapshot is ever edited. Views that show someone else's data
   take it as props and have no actions that write.

## Styling: Tailwind CSS v4

Tailwind is set up CSS-first in `src/ui/styles.css` (no `tailwind.config.js`),
via the `@tailwindcss/vite` plugin. Styles live in the components as utility
classes. The only other stylesheet is `themes.css`, which holds colour values
and nothing else.

### Decisions

1. **Every number is a pixel.** `--spacing` is `1px`, so `p-18` is 18px,
   `gap-10` is 10px, `w-34` is 34px. Font sizes are named the same way
   (`text-13` is 0.8125rem = 13px) and set no line height; radii too
   (`rounded-10`). This kept the migration from hand-written CSS pixel-exact.
2. **Closed theme.** Tailwind's default palette, type scale, radii and
   breakpoints are cleared. Only the design's own values exist. Add a token to
   `@theme` rather than repeating an arbitrary value.
3. **Colours are roles, never hues**, because every theme gives them different
   values. Pick by what the thing is, not what colour you want:
   | Role | Use |
   | --- | --- |
   | `page`, `card` | page background; cards, panels, fields |
   | `chip` | chips, tracks, soft fills |
   | `line`, `line-strong` | hairlines and card borders; empty marks, dashed borders |
   | `ink`, `body`, `faint` | titles and headings; labels and secondary text; metadata and done items only |
   | `primary` + `on-primary` | filled emphasis (primary button, urgent pill, today) and the text on it |
   | `primary-ink` | coloured text and icons on a card: links, hovers, counts |
   | `primary-strong` | bars, dots, thin marks, checkboxes |
   | `primary-tint` | pale fill: selected, high priority, pressed |
   | `accent` | focus ring, focused and hovered borders |
   | `watch`, `watch-mark`, `watch-tint`, `watch-ink` | worth watching (the theme's highlight): fill, small marks, pill/banner fill, text on that fill |
   | `shadow`, `scrim` | shadow colour; behind dialogs |

   `primary` and `primary-ink` differ on purpose: pale primaries (Euphie,
   March 7th, Peach milk) can't be text on white. Never use `on-primary` off a
   `primary` fill, or `watch` as text. Washes: `page-55` means 55% `page` over
   `card` (not opacity); plain opacity still works (`bg-chip/60`). No literal
   colours in components (`text-white`, `#fff`): a dark theme breaks them.
4. **Themes are palettes on `<html data-palette>`.** `styles.css` holds the
   default (Euphie light) and derives some roles by mixing others.
   `themes.css` overrides roles per palette. A theme with both modes has
   `<id>-light` and `<id>-dark` palettes; a one-mode theme is just `<id>`. To
   add a theme: a block in `themes.css` (with `color-scheme: dark` if dark), an
   entry in `THEMES` in `themes.ts`, then check that text keeps 4.5:1 on its
   background. The theme's own highlight colour goes in the `watch` roles. The
   inline script in `index.html` sets the saved palette before the first paint
   and must keep matching `themes.ts`'s storage shape and default.
5. **Max-first breakpoints.** The desktop layout is the default; narrow screens
   override it: `max-lg:` (< 800px, phone layout, 44px tap targets),
   `max-md:` (< 720px, stacked top bar, 2×2 glance board), `max-sm:`
   (< 640px, calendar dots and agenda).
6. **Three shared primitives are classes, not utility strings:** `.btn`
   (`btn-primary`, `btn-quiet`, `btn-small`, `btn-danger`), `.icon-btn`, and
   `.pill` (`pill-watch`, `pill-urgent`, `pill-high`, `pill-plain`,
   `pill-low`, `pill-outline` for Blocked). They are in `@layer components`, so any utility on the element
   still wins over them. Don't add more: a style used by one view belongs in
   that view's TSX, and repeated strings are a reason to extract a component
   (`RowAction`, `CalendarItem`, `OverviewBlock`) or a local constant.
7. **No conflicting utilities on one element.** Tailwind orders utilities by
   its own rules, not by their order in `class`, so `text-deep text-steel`
   is a coin toss. Pick one in TSX (`done ? 'text-steel' : 'text-deep'`).
   Components that take a `class` keep the parts a caller may replace in a
   separate prop (`EditableText`/`InlineInput` take `box` for margin, padding,
   border, radius and background). No `tailwind-merge`, no `!important`.
8. **State goes through variants where HTML already has it**:
   `aria-pressed:`, `aria-expanded:`, `aria-[current=page]:`, `has-checked:` style off the
   attributes the component sets for accessibility anyway; `data-empty:` marks
   an empty `EditableText`; `group/row` + `group-hover/row:` brighten a
   child while its row is hovered.
9. **`hover:` only applies on devices that can hover** (Tailwind v4's
   default), the same as the old `@media (hover: hover)` blocks.
10. **Scanning is limited to `src/`** (`@import 'tailwindcss' source('..')`).
   Otherwise Tailwind would read the committed `dist/index.html` and the build
   would depend on its own previous output. Class names must appear whole in
   the source: never build them by concatenation (`` `pill-${x}` `` is fine only
   for `@layer components` classes, which are always emitted; prefer a lookup
   object like `PriorityChip`'s `TONE`).
11. **Element defaults** (body type, focus ring, checkbox, heading colour, the
   16px phone font size for fields, reduced motion) are in `@layer base`.
   Keep `:root` custom properties there too: `--tap` (smallest tap target,
   34px, 44px below 800px) and `--gutter` (page side padding), used as
   `min-h-(--tap)` / `px-(--gutter)`.

## Checking visual changes

A pure refactor must not change pixels. Magica classic holds the original
palette value for value, so with it selected the app must match screenshots
taken before themes existed (hide the Theme button when comparing). The Tailwind migration was checked by
screenshotting about 100 states (three widths; hovers, focus, editing, dialogs,
Timeline) with Playwright against a build of the previous commit and diffing
them. All of them matched. Do the same for future style refactors. Chromium is
preinstalled in cloud sessions.
