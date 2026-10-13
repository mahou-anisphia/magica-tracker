import { useEffect, useRef, useState } from 'preact/hooks';
import { HomeIcon, SearchIcon } from '../components/icons';
import { go, set } from '../store';
import { orbSections, type OrbSection } from './orbMenu';
import { OrbCircle } from './OrbCircle';
import { OrbMark } from './OrbMark';
import { shortcutLabel } from './shortcut';

/** The cascade: each button rises a beat after the one below it. */
const STEP_MS = 40;
const rise = (fromBottom: number) => (fromBottom + 1) * STEP_MS;

/** The column's sizes, to line the side panel up with a circle: the close orb, a circle, the gap. */
const CLOSE_PX = 56;
const CIRCLE_PX = 52;
const GAP_PX = 12;

/** Left of the column: the corner spot, the orb's width and a gap. Phones stack it instead. */
const SIDE_SPOT = 'fixed top-16 right-[calc(max(24px,env(safe-area-inset-right,0px))+70px)]';

const FAB_SPOT =
  'fixed right-[max(24px,env(safe-area-inset-right,0px))] bottom-[calc(24px+env(safe-area-inset-bottom,0px))]';

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
  // A tap also fires hover and focus just before its click; only taps decide on touch.
  const hover = (fn: () => void) => () => {
    if (pointer.current !== 'touch') fn();
  };
  const choose = (s: OrbSection) => {
    if (pointer.current === 'touch' && active !== s.id) {
      setActive(s.id);
      setActionIndex(0);
      return;
    }
    run(s.open);
  };

  // Overview and Search have no actions, only a note on what they do.
  const notes: Record<string, { label: string; title: string; text: string }> = {
    home: {
      label: 'Overview',
      title: 'Back to your tracker',
      text: 'Your projects, tasks and backlog, as you left them. The Timeline is one switch away in the top bar.',
    },
    search: {
      label: 'Search',
      title: 'Finding anything',
      text: `Jump to a place, an action, a person, a project or a task by typing part of its name. ${shortcutLabel()} opens it from anywhere.`,
    },
  };
  // On touch, the first tap shows the note and a second tap goes.
  const tapNote = (id: string, fn: () => void) => {
    if (pointer.current === 'touch' && active !== id) setActive(id);
    else run(fn);
  };

  const section = sections.find((s) => s.id === active);
  const circles = sections.length + 2;
  const action = section?.actions[Math.min(actionIndex, section.actions.length - 1)];
  const note = active ? notes[active] : undefined;
  // The explanation beside the list: the hovered action's, or Overview's or Search's note.
  // How far above the corner spot the active circle's bottom edge sits.
  const order = ['home', 'search', ...sections.map((x) => x.id)];
  const below = order.length - 1 - order.indexOf(active ?? '');
  const lift = CLOSE_PX + GAP_PX + below * (CIRCLE_PX + GAP_PX);
  const card = section && action ? { ...action, label: section.label } : note;

  return (
    <>
      <button
        type="button"
        class={`${FAB_SPOT} z-20 inline-flex size-56 cursor-pointer items-center justify-center rounded-full border border-line bg-card text-ink shadow-toast`}
        aria-label="Menu: Overview, search, settings, Observatory and Team"
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
            onKeyDown={() => {
              pointer.current = 'keyboard';
            }}
          >
            <div class="flex flex-col items-center gap-12 max-sm:flex-row max-sm:justify-end max-sm:gap-8">
              <OrbCircle
                label="Overview"
                delay={rise(circles - 1)}
                selected={active === 'home'}
                onHover={hover(() => setActive('home'))}
                onClick={() => tapNote('home', () => go('overview'))}
              >
                <HomeIcon size={22} />
              </OrbCircle>
              <OrbCircle
                label={`Search (${shortcutLabel()})`}
                delay={rise(circles - 2)}
                selected={active === 'search'}
                onHover={hover(() => setActive('search'))}
                onClick={() => tapNote('search', () => set({ palette: true }))}
              >
                <SearchIcon size={22} />
              </OrbCircle>
              {sections.map((s, i) => (
                <OrbCircle
                  key={s.id}
                  label={s.label}
                  delay={rise(sections.length - 1 - i)}
                  selected={s.id === active}
                  expanded={s.id === active}
                  autoFocus={s.id === sections.at(-1)?.id}
                  onHover={hover(() => {
                    if (s.id !== active) setActionIndex(0);
                    setActive(s.id);
                  })}
                  onClick={() => choose(s)}
                >
                  {s.icon()}
                </OrbCircle>
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

            {/* Starts level with its circle and grows up the screen; when there
                isn't room above, it slides down rather than off the top. */}
            {card && (
              <div
                class={`${SIDE_SPOT} flex flex-col justify-end-safe max-sm:static`}
                style={{ bottom: `calc(24px + env(safe-area-inset-bottom, 0px) + ${lift}px)` }}
                onClick={(e) => {
                  if (e.target === e.currentTarget) setOpen(false);
                }}
              >
                <div class="flex flex-row-reverse items-end gap-14 max-sm:flex-col-reverse max-sm:items-stretch">
                  {/* Keyed by section, so a new section's actions rise in again. */}
                  {section && (
                    <nav
                      key={section.id}
                      aria-label={`${section.label} actions`}
                      class="flex w-250 flex-col items-stretch gap-6 max-sm:w-auto"
                    >
                      <span
                        style={{ animationDelay: `${rise(section.actions.length)}ms` }}
                        class="animate-cascade self-start rounded-full bg-ink px-12 py-2 text-12 font-semibold text-page"
                      >
                        {section.label}
                      </span>
                      {section.actions.map((a, i) => (
                        <button
                          key={a.id}
                          type="button"
                          style={{ animationDelay: `${rise(section.actions.length - 1 - i)}ms` }}
                          class={`grid min-h-52 animate-cascade cursor-pointer grid-cols-[8px_minmax(0,1fr)] items-center gap-x-12 rounded-12 px-16 py-8 text-left text-15 font-semibold shadow-pop ${
                            a === action ? 'bg-primary text-on-primary' : 'bg-card text-ink'
                          }`}
                          onMouseEnter={() => setActionIndex(i)}
                          onFocus={() => setActionIndex(i)}
                          onClick={() => run(a.run)}
                        >
                          <span class={`size-8 rounded-full ${a === action ? 'bg-on-primary' : 'bg-line-strong'}`} aria-hidden="true" />
                          {a.label}
                          <span class={`col-start-2 hidden text-12 font-normal max-sm:block ${a === action ? 'text-on-primary' : 'text-body'}`}>
                            {a.text}
                          </span>
                        </button>
                      ))}
                    </nav>
                  )}

                  {/* On phones an action's text is on its own button, so only a note needs the card. */}
                  {card && (
                    <div
                      key={`${active}-card`}
                      style={{ animationDelay: `${rise(section ? section.actions.length : 0)}ms` }}
                      class={`w-300 animate-cascade rounded-14 bg-card px-22 py-20 shadow-dialog max-sm:w-auto ${section ? 'max-sm:hidden' : ''}`}
                      aria-live="polite"
                    >
                      <div class="text-12 font-semibold text-primary-ink">{card.label}</div>
                      <div class="mt-2 mb-8 border-b border-line pb-10 text-18 font-semibold text-ink">{card.title}</div>
                      <p class="text-14 text-body">{card.text}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </dialog>
    </>
  );
}
