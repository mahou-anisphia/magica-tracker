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
  App.tsx            the shell around both views: keyboard shortcuts, the clock, view switch
  store.ts           state + commit(); actions.ts: everything that changes it
  styles.css         Tailwind entry: theme tokens, element defaults, shared primitives
  components/        GLOBAL: only components used by more than one view (or a view and the shell)
    icons.tsx  Modal.tsx  PriorityChip.tsx
  shell/             app frame rendered once by App in every view: top bar, banners, dialogs, toast
  views/
    overview/        the Overview page: OverviewView.tsx + every component only it uses
    timeline/        the Timeline page: TimelineView.tsx + every component only it uses
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
   showing, so they live in `shell/`, not in `components/`.
4. **One component per file**, the file named after the component. Small
   non-component helpers shared within a folder get their own file too
   (`controlledCheck.ts`, `timeline/dueItem.ts`).
5. **Imports go down or sideways, never across views.** A view may import from
   `components/`, `store`, `actions` and `src/core`, but never from another
   view's folder. If it needs to, the thing belongs in `components/`.

## Styling: Tailwind CSS v4

Tailwind is set up CSS-first in `src/ui/styles.css` (no `tailwind.config.js`),
via the `@tailwindcss/vite` plugin. Styles live in the components as utility
classes. There is no other stylesheet.

### Decisions

1. **Every number is a pixel.** `--spacing` is `1px`, so `p-18` is 18px,
   `gap-10` is 10px, `w-34` is 34px. Font sizes are named the same way
   (`text-13` is 0.8125rem = 13px) and set no line height; radii too
   (`rounded-10`). This kept the migration from hand-written CSS pixel-exact.
2. **Closed theme.** Tailwind's default palette, type scale, radii and
   breakpoints are cleared. Only the design's own values exist:
   - colours are the palette names from the README: `mist`, `frost`, `ash`,
     `steel`, `slate`, `deep`, `gold`, `burnished`, `iris`, `iris-deep`, plus
     `card`, `line`, `iris-tint`, `gold-tint`, `gold-ink`;
   - washes: `mist-55` means 55% Mist over a white card (not opacity). Plain
     opacity still works as usual: `bg-frost/60`.
   Add a token to `@theme` rather than repeating an arbitrary value.
3. **Max-first breakpoints.** The desktop layout is the default; narrow screens
   override it: `max-lg:` (< 800px, phone layout, 44px tap targets),
   `max-md:` (< 720px, stacked top bar, 2×2 glance board), `max-sm:`
   (< 640px, calendar dots and agenda).
4. **Three shared primitives are classes, not utility strings:** `.btn`
   (`btn-primary`, `btn-quiet`, `btn-small`, `btn-danger`), `.icon-btn`, and
   `.pill` (`pill-watch`, `pill-urgent`, `pill-high`, `pill-plain`,
   `pill-low`). They are in `@layer components`, so any utility on the element
   still wins over them. Don't add more: a style used by one view belongs in
   that view's TSX, and repeated strings are a reason to extract a component
   (`RowAction`, `CalendarItem`, `OverviewBlock`) or a local constant.
5. **No conflicting utilities on one element.** Tailwind orders utilities by
   its own rules, not by their order in `class`, so `text-deep text-steel`
   is a coin toss. Pick one in TSX (`done ? 'text-steel' : 'text-deep'`).
   Components that take a `class` keep the parts a caller may replace in a
   separate prop (`EditableText`/`InlineInput` take `box` for margin, padding,
   border, radius and background). No `tailwind-merge`, no `!important`.
6. **State goes through variants where HTML already has it**:
   `aria-pressed:`, `aria-expanded:`, `aria-[current=page]:` style off the
   attributes the component sets for accessibility anyway; `data-empty:` marks
   an empty `EditableText`; `group/row` + `group-hover/row:` brighten a
   child while its row is hovered.
7. **`hover:` only applies on devices that can hover** (Tailwind v4's
   default), the same as the old `@media (hover: hover)` blocks.
8. **Scanning is limited to `src/`** (`@import 'tailwindcss' source('..')`).
   Otherwise Tailwind would read the committed `dist/index.html` and the build
   would depend on its own previous output. Class names must appear whole in
   the source: never build them by concatenation (`` `pill-${x}` `` is fine only
   for `@layer components` classes, which are always emitted; prefer a lookup
   object like `PriorityChip`'s `TONE`).
9. **Element defaults** (body type, focus ring, checkbox, heading colour, the
   16px phone font size for fields, reduced motion) are in `@layer base`.
   Keep `:root` custom properties there too: `--tap` (smallest tap target,
   34px, 44px below 800px) and `--gutter` (page side padding), used as
   `min-h-(--tap)` / `px-(--gutter)`.

## Checking visual changes

A pure refactor must not change pixels. The Tailwind migration was checked by
screenshotting about 100 states (three widths; hovers, focus, editing, dialogs,
Timeline) with Playwright against a build of the previous commit and diffing
them. All of them matched. Do the same for future style refactors. Chromium is
preinstalled in cloud sessions.
