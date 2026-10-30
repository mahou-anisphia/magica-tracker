import { useId, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { CheckIcon, ChevronIcon } from './icons';
import { placePopover, useFollowAnchor } from './placePopover';

export type SelectOption<T extends string> = { value: T; label: string };

/**
 * How the closed select looks: `field` is bordered like an input; `quiet` is
 * a line of text with a chevron (under a title); `dashed` is an "add" row
 * whose options are actions.
 */
type Variant = 'field' | 'quiet' | 'dashed';

const TRIGGER: Record<Variant, string> = {
  field:
    'inline-flex min-h-30 cursor-pointer items-center justify-between gap-8 rounded-8 border border-line bg-card py-2 pr-6 pl-10 text-ink hover:border-accent aria-expanded:border-accent disabled:cursor-default disabled:opacity-45 max-lg:min-h-44 max-lg:text-16',
  quiet:
    'inline-flex cursor-pointer items-center gap-2 bg-transparent text-12 text-body hover:text-primary-ink aria-expanded:text-primary-ink disabled:cursor-default',
  dashed:
    'flex min-h-40 w-full cursor-pointer items-center justify-between gap-8 rounded-10 border border-dashed border-line-strong bg-transparent px-12 text-body hover:border-accent hover:text-primary-ink aria-expanded:border-accent max-lg:min-h-44 max-lg:text-16',
};

const SIZE = { small: 'text-13', normal: 'text-14' };

const OPTION = {
  active: 'bg-primary-tint-45 text-primary-ink',
  idle: 'text-ink',
};

/** The tallest list before it scrolls, for choosing above or below. */
const MAX_HEIGHT = 320;

/**
 * The app's dropdown, in place of a native <select> (whose open list the
 * system draws, off-theme): a button that opens a themed list in a popover.
 * Arrow keys, Home and End move, Enter or Space picks, a letter jumps to the
 * next option starting with it, Escape or a click outside closes. With
 * `placeholder` and a `value` that matches no option, it is an action menu
 * ("+ Add a project"): the trigger always shows the placeholder. Name it with
 * `label`, or with a <label for={id}>.
 */
export function Select<T extends string>(props: {
  value: T | '';
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  label?: string;
  id?: string;
  placeholder?: string;
  variant?: Variant;
  size?: 'small' | 'normal';
  disabled?: boolean;
  /** Layout only (width, max width, alignment); the look comes from `variant`. */
  class?: string;
}) {
  const { options } = props;
  const variant = props.variant ?? 'field';
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const base = `select-${useId()}`;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const selected = options.findIndex((o) => o.value === props.value);
  const shown = selected >= 0 ? options[selected]!.label : (props.placeholder ?? '—');

  const place = () => {
    // As wide as the trigger, and never so narrow that labels crowd (placePopover keeps it on screen).
    const width = Math.max(trigger.current?.offsetWidth ?? 0, 200);
    placePopover(list.current, trigger.current, { width, maxHeight: MAX_HEIGHT, align: 'start' });
    if (list.current) list.current.style.width = `${width}px`;
  };
  useFollowAnchor(open, place);

  useLayoutEffect(() => {
    if (open) list.current?.querySelector(`#${CSS.escape(`${base}-${active}`)}`)?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  const close = () => {
    if (list.current?.matches(':popover-open')) list.current.hidePopover();
  };
  const pick = (i: number) => {
    const o = options[i];
    close();
    trigger.current?.focus();
    if (o && o.value !== props.value) props.onChange(o.value);
  };

  const onListKey = (e: KeyboardEvent) => {
    const last = options.length - 1;
    const to = { ArrowDown: Math.min(active + 1, last), ArrowUp: Math.max(active - 1, 0), Home: 0, End: last }[e.key];
    if (to !== undefined) {
      e.preventDefault();
      setActive(to);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      pick(active);
    } else if (e.key === 'Escape') {
      // Handled here so App's Escape doesn't also act (collapse the open task).
      e.preventDefault();
      e.stopPropagation();
      close();
      trigger.current?.focus();
    } else if (e.key === 'Tab') {
      close();
    } else if (e.key.length === 1 && /\S/.test(e.key)) {
      const k = e.key.toLowerCase();
      const order = [...options.keys()].map((n) => (active + 1 + n) % options.length);
      const hit = order.find((n) => options[n]!.label.replace(/^[^\p{L}\p{N}]+/u, '').toLowerCase().startsWith(k));
      if (hit !== undefined) setActive(hit);
    }
  };

  return (
    <>
      <button
        ref={trigger}
        id={props.id}
        type="button"
        class={`${TRIGGER[variant]} ${variant === 'quiet' ? '' : SIZE[props.size ?? 'normal']} ${props.class ?? ''}`}
        popovertarget={`${base}-list`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${base}-list`}
        aria-label={props.label ? `${props.label}: ${shown}` : undefined}
        disabled={props.disabled}
        onKeyDown={(e) => {
          if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
          e.preventDefault();
          list.current?.showPopover();
        }}
      >
        <span class="min-w-0 truncate">{shown}</span>
        <span class={`inline-flex flex-none transition-transform ${open ? 'rotate-180' : ''} ${variant === 'quiet' ? 'scale-75' : ''}`} aria-hidden="true">
          <ChevronIcon dir="down" />
        </span>
      </button>
      <div
        ref={list}
        id={`${base}-list`}
        popover="auto"
        role="listbox"
        tabIndex={-1}
        aria-label={props.label}
        aria-labelledby={props.label ? undefined : props.id}
        aria-activedescendant={open ? `${base}-${active}` : undefined}
        // A card in the top layer, so no overflow clips it; place() puts it by the trigger.
        class="fixed inset-auto m-0 max-h-320 overflow-y-auto rounded-12 border border-line bg-card p-4 text-ink shadow-pop open:animate-pop focus:outline-none"
        onBeforeToggle={(e) => {
          if (e.newState === 'open') {
            place();
            setActive(Math.max(selected, 0));
            setOpen(true);
          } else {
            setOpen(false);
          }
        }}
        onToggle={(e) => {
          if (e.newState === 'open') list.current?.focus();
        }}
        onKeyDown={onListKey}
      >
        {open &&
          options.map((o, i) => (
            <div
              key={o.value}
              id={`${base}-${i}`}
              role="option"
              aria-selected={i === selected}
              class={`flex min-h-34 cursor-pointer items-center gap-8 rounded-8 px-10 text-14 max-lg:min-h-44 max-lg:text-16 ${OPTION[i === active ? 'active' : 'idle']} ${i === selected ? 'font-medium' : ''}`}
              onMouseMove={() => i !== active && setActive(i)}
              onClick={() => pick(i)}
            >
              <span class="min-w-0 flex-1 truncate">{o.label}</span>
              {i === selected && (
                <span class="inline-flex flex-none text-primary-ink" aria-hidden="true">
                  <CheckIcon size={14} />
                </span>
              )}
            </div>
          ))}
      </div>
    </>
  );
}
