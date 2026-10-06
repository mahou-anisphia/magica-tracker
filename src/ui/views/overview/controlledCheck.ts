/**
 * Controlled checkbox: put the DOM back to the stored value right away and let
 * the store decide, since unticking a parent may be cancelled at the confirm.
 */
export function controlledCheck(current: boolean, apply: (want: boolean) => void) {
  return (e: Event) => {
    const input = e.currentTarget as HTMLInputElement;
    const want = input.checked;
    input.checked = current;
    apply(want);
  };
}
