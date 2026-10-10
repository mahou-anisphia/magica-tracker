import { readTheme, writeTheme } from '../storage/local';

/**
 * The themes. Their colours live in themes.css as palettes, one per mode,
 * named `<id>-light` / `<id>-dark` when a theme has both and just `<id>` when
 * it has one. The swatches here only draw the picker.
 */
export type ThemeId = 'euphie' | 'march-7th' | 'firefly' | 'lavender-haze' | 'peach-milk' | 'moonlit-cloud' | 'magica';
export type Appearance = 'system' | 'light' | 'dark';
export type ThemeChoice = { theme: ThemeId; appearance: Appearance };

/** Page, primary and highlight colours, for the picker's swatch. */
type Swatch = readonly [page: string, primary: string, highlight: string];

export type Theme = {
  id: ThemeId;
  name: string;
  /** Light and dark when both are given; otherwise the one it has. */
  light?: Swatch;
  dark?: Swatch;
};

export const THEMES: readonly Theme[] = [
  { id: 'euphie', name: 'Euphie', light: ['#f6f8fb', '#a9c9e2', '#f3d778'], dark: ['#1e2742', '#9cc3e6', '#f3d778'] },
  { id: 'march-7th', name: 'March 7th', light: ['#fff3f8', '#f29ab8', '#7cc8ee'], dark: ['#1c2340', '#f6a8c6', '#a6e3f7'] },
  { id: 'firefly', name: 'Firefly', light: ['#f4f5d8', '#3a7f86', '#e8d88a'], dark: ['#173439', '#8fbdb5', '#e8d88a'] },
  { id: 'lavender-haze', name: 'Lavender haze', light: ['#f4effa', '#9b8ac4', '#f2b5c4'] },
  { id: 'peach-milk', name: 'Peach milk', light: ['#fff4ea', '#e8a598', '#a9b8d9'] },
  { id: 'moonlit-cloud', name: 'Moonlit cloud', dark: ['#232743', '#b8a9e8', '#f5c6a5'] },
  { id: 'magica', name: 'Magica classic', light: ['#f2f6fa', '#534ab7', '#f0c060'] },
];

/** Euphie, following the system's light or dark setting. index.html assumes this too. */
export const DEFAULT_THEME: ThemeChoice = { theme: 'euphie', appearance: 'system' };

const APPEARANCES: readonly Appearance[] = ['system', 'light', 'dark'];

export function themeById(id: ThemeId): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0]!;
}

export function hasBothModes(t: Theme): boolean {
  return !!(t.light && t.dark);
}

/** The palette for each mode: a one-mode theme answers the same for both. */
function palettes(t: Theme): { light: string; dark: string } {
  if (hasBothModes(t)) return { light: `${t.id}-light`, dark: `${t.id}-dark` };
  return { light: t.id, dark: t.id };
}

const darkQuery = () => globalThis.matchMedia?.('(prefers-color-scheme: dark)');

export function paletteFor(choice: ThemeChoice): string {
  const p = palettes(themeById(choice.theme));
  const dark = choice.appearance === 'system' ? !!darkQuery()?.matches : choice.appearance === 'dark';
  return dark ? p.dark : p.light;
}

/** The saved choice, or the default when nothing valid is saved. */
export function readThemeChoice(): ThemeChoice {
  const s = readTheme();
  const theme = THEMES.find((t) => t.id === s?.theme)?.id ?? DEFAULT_THEME.theme;
  const appearance = APPEARANCES.find((a) => a === s?.appearance) ?? DEFAULT_THEME.appearance;
  return { theme, appearance };
}

export function saveThemeChoice(choice: ThemeChoice): void {
  writeTheme({ ...choice, ...palettes(themeById(choice.theme)) });
}

/** Put the palette on <html>, and tell the browser chrome the page colour. */
export function applyTheme(choice: ThemeChoice): void {
  const root = document.documentElement;
  root.dataset.palette = paletteFor(choice);
  const page = getComputedStyle(root).getPropertyValue('--color-page').trim();
  if (page) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', page);
}

/** Re-apply when the system switches between light and dark. */
export function onSystemAppearanceChange(handler: () => void): void {
  darkQuery()?.addEventListener('change', handler);
}
