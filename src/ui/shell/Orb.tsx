import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { HomeIcon, SearchIcon } from '../components/icons';
import { go, set } from '../store';
import { orbSections, type OrbSection } from './orbMenu';
import { shortcutLabel } from './shortcut';

const FAB_SPOT =
  'fixed right-[max(24px,env(safe-area-inset-right,0px))] bottom-[calc(24px+env(safe-area-inset-bottom,0px))]';

/** The brand mark: a ring with a coloured core and a small highlight dot. Lit while open. */
function OrbMark(props: { lit: boolean }) {
  return (
    <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="12" fill="none" stroke="currentColor" stroke-width="2.5" />
      <circle cx="16" cy="16" r={props.lit ? 5.5 : 4.5} class={props.lit ? 'fill-accent' : 'fill-primary'} />
      <circle cx="24.5" cy="8" r="2.6" class="fill-watch" />
    </svg>
  );
}

function Circle(props: {
  label: string;
  selected?: boolean;
  autoFocus?: boolean;
  expanded?: boolean;
  onHover?: () => void;
  onClick: () => void;
  children: ComponentChildren;
}) {
  return (
    <button
      type="button"
      aria-label={props.label}
      title={props.label}
      aria-expanded={props.expanded}
      autoFocus={props.autoFocus}
      class={`inline-flex size-52 flex-none cursor-pointer items-center justify-center rounded-full border-2 shadow-pop ${
        props.selected ? 'border-primary bg-primary text-on-primary' : 'border-line bg-card text-body hover:text-primary-ink'
      }`}
      onMouseEnter={props.onHover}
      onFocus={props.onHover}
      onClick={props.onClick}
    >
      {props.children}
    </button>
  );
}

/**
 * The orb in the bottom-right corner: the way to everything beyond the
 * tracker. Opening it shows round buttons for Overview, search and each
 * section. Hovering or focusing a section lists its common actions; hovering
 * an action explains it. Choosing an action opens its screen and points at
 * the part to use. On touch, the first tap on a section lists its actions and
 * a second tap opens it.
 */
export function Orb() {
  const dialog = useRef<HTMLDialogElement>(null);
  const pointer = useRef('mouse');
  const [open, setOpen] = useState(false);
  const sections = orbSections();
  const [active, setActive] = useState<string | null>(null);
  const [actionIndex, setActionIndex] = useState(0);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const start = () => {
    setActive(sections.at(-1)?.id ?? null);
    setActionIndex(0);
    setOpen(true);
  };
  const run = (fn: () => void) => {
    setOpen(false);
    fn();
  };
  const choose = (s: OrbSection) => {
    if (pointer.current === 'touch' && active !== s.id) {
      setActive(s.id);
      setActionIndex(0);
      return;
    }
    run(s.open);
  };

  const section = sections.find((s) => s.id === active);
  const action = section?.actions[Math.min(actionIndex, section.actions.length - 1)];

  return (
    <>
      <button
        type="button"
        class={`${FAB_SPOT} z-20 inline-flex size-56 cursor-pointer items-center justify-center rounded-full border border-line bg-card text-ink shadow-toast`}
        aria-label="Menu: Overview, search and settings"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={start}
      >
        <OrbMark lit={false} />
      </button>

      <dialog
        ref={dialog}
        aria-label="Menu"
        class="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none bg-transparent p-0 backdrop:bg-scrim backdrop:backdrop-blur-[3px]"
        onCancel={(e) => {
          e.preventDefault();
          setOpen(false);
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) setOpen(false);
        }}
      >
        {open && (
          <div
            class={`${FAB_SPOT} flex flex-row-reverse items-end gap-14 max-sm:left-16 max-sm:flex-col-reverse max-sm:items-stretch`}
            onPointerDown={(e) => {
              pointer.current = e.pointerType;
            }}
          >
            <div class="flex flex-col items-center gap-12 max-sm:flex-row max-sm:justify-end">
              <Circle label="Overview" onHover={() => setActive(null)} onClick={() => run(() => go('overview'))}>
                <HomeIcon size={22} />
              </Circle>
              <Circle label={`Search (${shortcutLabel()})`} onHover={() => setActive(null)} onClick={() => run(() => set({ palette: true }))}>
                <SearchIcon size={22} />
              </Circle>
              {sections.map((s) => (
                <Circle
                  key={s.id}
                  label={s.label}
                  selected={s.id === active}
                  expanded={s.id === active}
                  autoFocus={s.id === sections.at(-1)?.id}
                  onHover={() => {
                    if (s.id !== active) setActionIndex(0);
                    setActive(s.id);
                  }}
                  onClick={() => choose(s)}
                >
                  {s.icon()}
                </Circle>
              ))}
              <button
                type="button"
                class="inline-flex size-56 flex-none cursor-pointer items-center justify-center rounded-full border border-line bg-primary-tint text-ink shadow-toast"
                aria-label="Close the menu"
                onClick={() => setOpen(false)}
              >
                <OrbMark lit />
              </button>
            </div>

            {section && (
              <div class="flex w-260 flex-col gap-2 rounded-14 bg-card p-6 shadow-dialog max-sm:w-auto">
                <span class="px-10 pt-4 pb-2 text-12 font-semibold text-primary-ink">{section.label}</span>
                {section.actions.map((a, i) => (
                  <button
                    key={a.id}
                    type="button"
                    class={`grid min-h-44 cursor-pointer grid-cols-1 content-center rounded-10 px-12 py-6 text-left text-15 font-medium ${
                      a === action ? 'bg-primary-tint text-ink' : 'bg-transparent text-ink'
                    }`}
                    onMouseEnter={() => setActionIndex(i)}
                    onFocus={() => setActionIndex(i)}
                    onClick={() => run(a.run)}
                  >
                    {a.label}
                    <span class="hidden text-12 font-normal text-body max-sm:block">{a.text}</span>
                  </button>
                ))}
              </div>
            )}

            {section && action && (
              <div class="w-300 rounded-14 bg-card px-22 py-20 shadow-dialog max-sm:hidden" aria-live="polite">
                <div class="text-12 font-semibold text-primary-ink">{section.label}</div>
                <div class="mt-2 mb-8 border-b border-line pb-10 text-18 font-semibold text-ink">{action.title}</div>
                <p class="text-14 text-body">{action.text}</p>
              </div>
            )}
          </div>
        )}
      </dialog>
    </>
  );
}
