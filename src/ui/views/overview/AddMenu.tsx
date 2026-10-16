import { useEffect, useRef, useState } from 'preact/hooks';
import { PlusIcon } from '../../components/icons';

const ITEM =
  'grid w-full cursor-pointer grid-cols-1 gap-1 rounded-8 px-10 py-6 text-left hover:bg-page-70 focus-visible:bg-page-70 focus-visible:outline-none max-lg:min-h-44';

/**
 * The "+" beside "Projects": a small menu to make a project or a domain.
 * Arrow keys move between the two, Escape or a click outside closes it.
 */
export function AddMenu(props: { onProject: () => void; onDomain: () => void }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    box.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    const outside = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    addEventListener('pointerdown', outside, true);
    return () => removeEventListener('pointerdown', outside, true);
  }, [open]);

  const choose = (fn: () => void) => {
    setOpen(false);
    fn();
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      setOpen(false);
      button.current?.focus();
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const items = [...(box.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
      const i = items.indexOf(document.activeElement as HTMLElement);
      items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus();
    }
  };

  return (
    <div ref={box} class="relative" onKeyDown={onKeyDown}>
      <button
        ref={button}
        type="button"
        class="icon-btn"
        aria-label="New project or domain"
        title="New project or domain"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <PlusIcon />
      </button>
      {open && (
        <div role="menu" aria-label="New" class="absolute top-full right-0 z-20 mt-6 grid w-224 grid-cols-1 gap-2 rounded-12 border border-line bg-card p-4 shadow-pop animate-pop">
          <button type="button" role="menuitem" class={ITEM} onClick={() => choose(props.onProject)}>
            <span class="text-14 font-medium text-ink">New project</span>
            <span class="text-12 text-body">At the end of the list</span>
          </button>
          <button type="button" role="menuitem" class={ITEM} onClick={() => choose(props.onDomain)}>
            <span class="text-14 font-medium text-ink">New domain</span>
            <span class="text-12 text-body">Or drop one project onto another</span>
          </button>
        </div>
      )}
    </div>
  );
}
