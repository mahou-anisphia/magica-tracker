/** True on Apple platforms, where the palette shortcut is ⌘K rather than Ctrl+K. */
export function isApple(): boolean {
  const nav = globalThis.navigator as Navigator & { userAgentData?: { platform?: string } };
  const platform = nav?.userAgentData?.platform || nav?.platform || '';
  return /mac|iphone|ipad|ipod/i.test(platform);
}

export function shortcutLabel(): string {
  return isApple() ? '⌘K' : 'Ctrl+K';
}
