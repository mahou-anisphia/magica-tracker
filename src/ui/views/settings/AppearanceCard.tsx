import { useId } from 'preact/hooks';
import { setTheme } from '../../store';
import { hasBothModes, THEMES, themeById, type Appearance, type Theme, type ThemeChoice } from '../../themes';
import { Segmented } from '../../components/Segmented';
import { Panel } from '../../components/Panel';

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

/** Every theme with a swatch, then System, Light or Dark for themes that have both. */
export function AppearanceCard(props: { choice: ThemeChoice }) {
  const { choice } = props;
  const name = `theme-${useId()}`;
  const current = themeById(choice.theme);
  return (
    <Panel id="appearance-h" title="Appearance" highlight="settings-theme" note="Remembered in this browser only.">
      <div role="radiogroup" aria-labelledby="appearance-h" class="grid grid-cols-1 gap-2">
        {THEMES.map((t) => (
          <label
            key={t.id}
            class="flex min-h-(--tap) cursor-pointer items-center gap-10 rounded-10 px-8 py-4 hover:bg-page-70 has-checked:bg-primary-tint has-focus-visible:outline-2 has-focus-visible:outline-accent"
          >
            <input
              type="radio"
              name={name}
              class="sr-only"
              checked={t.id === choice.theme}
              onChange={() => setTheme({ ...choice, theme: t.id })}
            />
            <Swatch theme={t} />
            <span class="min-w-0 flex-1 truncate font-medium text-ink">{t.name}</span>
            <span class="text-12 text-body">{modes(t)}</span>
          </label>
        ))}
      </div>
      <div class="flex flex-wrap items-center justify-between gap-8 border-t border-line pt-12">
        <span class="text-13 font-medium text-body">Light or dark</span>
        {hasBothModes(current) ? (
          <Segmented
            label="Light or dark"
            value={choice.appearance}
            options={APPEARANCES}
            onChange={(appearance) => setTheme({ ...choice, appearance })}
          />
        ) : (
          <span class="text-13 text-body">{current.light ? 'Light only' : 'Dark only'}</span>
        )}
      </div>
    </Panel>
  );
}
