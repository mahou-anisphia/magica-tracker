import { useId, useRef, useState } from 'preact/hooks';
import { PaletteIcon } from '../components/icons';
import { placePopover, useFollowAnchor } from '../components/placePopover';
import { setTheme } from '../store';
import { hasBothModes, THEMES, themeById, type Appearance, type Theme, type ThemeChoice } from '../themes';

const APPEARANCES: { value: Appearance; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

function modes(t: Theme): string {
  if (hasBothModes(t)) return 'Light & dark';
  return t.light ? 'Light' : 'Dark';
}

/** Page, primary and highlight, overlapping like paint dabs. */
function Swatch(props: { theme: Theme }) {
  const colors = props.theme.light ?? props.theme.dark ?? [];
  return (
    <span class="flex flex-none -space-x-5" aria-hidden="true">
      {colors.map((c) => (
        <span key={c} class="size-16 rounded-full border border-line" style={{ background: c }} />
      ))}
    </span>
  );
}

/**
 * The theme button in the top bar and its popover: every theme with a swatch,
 * then System, Light or Dark for themes that have both. Choices apply at once
 * and are remembered per browser.
 */
export function ThemePicker(props: { choice: ThemeChoice }) {
  const { choice } = props;
  const trigger = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const id = `theme-${useId()}`;
  const current = themeById(choice.theme);

  const place = () => placePopover(pop.current, trigger.current, { width: 300, maxHeight: 440, align: 'start' });
  useFollowAnchor(open, place);

  return (
    <>
      <button
        ref={trigger}
        type="button"
        class="btn btn-quiet btn-small"
        popovertarget={id}
        aria-haspopup="dialog"
        aria-label={`Theme: ${current.name}. Change theme`}
      >
        <PaletteIcon />
        {current.name}
      </button>
      <div
        ref={pop}
        id={id}
        popover="auto"
        role="dialog"
        aria-labelledby={`${id}-h`}
        class="fixed inset-auto m-0 w-[min(300px,calc(100vw-16px))] rounded-14 border border-line bg-card p-10 text-ink shadow-pop open:animate-pop"
        onBeforeToggle={(e) => {
          if (e.newState === 'open') place();
          setOpen(e.newState === 'open');
        }}
        onToggle={(e) => {
          if (e.newState === 'open') pop.current?.querySelector<HTMLElement>('input:checked')?.focus();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            // Handled here so App's Escape doesn't also collapse the open task.
            e.preventDefault();
            pop.current?.hidePopover();
          }
        }}
      >
        <h2 id={`${id}-h`} class="mb-6 px-8 pt-2 text-13 font-medium text-body">
          Theme
        </h2>
        <div role="radiogroup" aria-labelledby={`${id}-h`} class="grid grid-cols-1 gap-2">
          {THEMES.map((t) => (
            <label
              key={t.id}
              class="flex min-h-(--tap) cursor-pointer items-center gap-10 rounded-10 px-8 py-4 hover:bg-page-70 has-checked:bg-primary-tint has-focus-visible:outline-2 has-focus-visible:outline-accent"
            >
              <input
                type="radio"
                name={id}
                class="sr-only"
                checked={t.id === choice.theme}
                onChange={() => setTheme({ ...choice, theme: t.id })}
              />
              <Swatch theme={t} />
              <span class="min-w-0 flex-1 truncate font-medium">{t.name}</span>
              <span class="text-12 text-body">{modes(t)}</span>
            </label>
          ))}
        </div>
        <div class="mt-8 flex flex-wrap items-center justify-between gap-8 border-t border-line px-8 pt-10 pb-2">
          <span id={`${id}-a`} class="text-13 font-medium text-body">
            Appearance
          </span>
          {hasBothModes(current) ? (
            <div role="radiogroup" aria-labelledby={`${id}-a`} class="inline-flex gap-2 rounded-10 bg-chip-55 p-3">
              {APPEARANCES.map((a) => (
                <label
                  key={a.value}
                  class="cursor-pointer rounded-8 px-10 py-3 text-13 font-medium text-body hover:text-primary-ink has-checked:bg-card has-checked:text-ink has-checked:shadow-segment has-focus-visible:outline-2 has-focus-visible:outline-accent"
                >
                  <input
                    type="radio"
                    name={`${id}-a`}
                    class="sr-only"
                    checked={a.value === choice.appearance}
                    onChange={() => setTheme({ ...choice, appearance: a.value })}
                  />
                  {a.label}
                </label>
              ))}
            </div>
          ) : (
            <span class="text-13 text-faint">{current.light ? 'Light only' : 'Dark only'}</span>
          )}
        </div>
      </div>
    </>
  );
}
