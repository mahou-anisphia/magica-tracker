import type { RefObject } from 'preact';
import { useLayoutEffect, useRef, useState } from 'preact/hooks';
import { monthGrid } from '../../core/calendar';
import { monthHeading } from '../../core/format';
import { localDateStamp } from '../../core/time';
import { ChevronIcon } from './icons';

const weekdayShort = new Intl.DateTimeFormat(undefined, { weekday: 'short' });
const fullDay = new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
// 2024-01-01 was a Monday.
const WEEKDAYS = Array.from({ length: 7 }, (_, i) => weekdayShort.format(new Date(2024, 0, 1 + i)));

/** Estimated tallest picker (six weeks), for choosing above or below. */
const MAX_HEIGHT = 360;
const GAP = 6;
const EDGE = 8;

const parseDay = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y!, m! - 1, d!);
};

const addDays = (s: string, n: number) => {
  const d = parseDay(s);
  return localDateStamp(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n));
};

/** Same day in another month, clamped: 31 Jan + 1 month is 28/29 Feb. */
const addMonths = (s: string, n: number) => {
  const d = parseDay(s);
  const last = new Date(d.getFullYear(), d.getMonth() + n + 1, 0).getDate();
  return localDateStamp(new Date(d.getFullYear(), d.getMonth() + n, Math.min(d.getDate(), last)));
};

/**
 * A small month calendar in a popover, opened by the button whose
 * `popovertarget` is `id`. The browser handles outside clicks and returns
 * focus to that button on close. Arrow keys move by day and week, Page Up/Down
 * by month, Home/End to the ends of the week.
 */
export function DatePicker(props: {
  id: string;
  anchor: RefObject<HTMLElement>;
  value: string | undefined;
  now: Date;
  /** What the deadline belongs to, for screen readers. */
  of: string;
  onChange: (due: string | undefined) => void;
}) {
  const pop = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  // The day that takes Tab focus; the month shown is its month.
  const [active, setActive] = useState(props.value ?? '');
  const focusActive = useRef(false);
  const today = localDateStamp(props.now);

  // Below the button, right edges aligned; above when there's more room there.
  const place = () => {
    const el = pop.current;
    const a = props.anchor.current;
    if (!el || !a) return;
    const r = a.getBoundingClientRect();
    const width = Math.min(284, innerWidth - EDGE * 2);
    const left = Math.min(Math.max(r.right - width, EDGE), innerWidth - width - EDGE);
    const below = innerHeight - r.bottom;
    const up = below < MAX_HEIGHT && r.top > below;
    el.style.left = `${left}px`;
    el.style.top = up ? 'auto' : `${r.bottom + GAP}px`;
    el.style.bottom = up ? `${innerHeight - r.top + GAP}px` : 'auto';
  };

  useLayoutEffect(() => {
    if (!open) return;
    addEventListener('resize', place);
    addEventListener('scroll', place, true); // capture: any scrolling ancestor
    return () => {
      removeEventListener('resize', place);
      removeEventListener('scroll', place, true);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!focusActive.current) return;
    focusActive.current = false;
    pop.current?.querySelector<HTMLElement>(`[data-date="${active}"]`)?.focus();
  });

  const close = () => {
    if (pop.current?.matches(':popover-open')) pop.current.hidePopover();
  };
  const pick = (due: string | undefined) => {
    close();
    props.onChange(due);
  };
  const move = (to: string) => {
    focusActive.current = true;
    setActive(to);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      // Handled here so App's Escape doesn't also collapse the open task.
      e.preventDefault();
      close();
      return;
    }
    if (!(e.target instanceof HTMLElement) || !e.target.dataset.date) return;
    const weekday = (parseDay(active).getDay() + 6) % 7; // Monday = 0
    const to = {
      ArrowLeft: addDays(active, -1),
      ArrowRight: addDays(active, 1),
      ArrowUp: addDays(active, -7),
      ArrowDown: addDays(active, 7),
      PageUp: addMonths(active, e.shiftKey ? -12 : -1),
      PageDown: addMonths(active, e.shiftKey ? 12 : 1),
      Home: addDays(active, -weekday),
      End: addDays(active, 6 - weekday),
    }[e.key];
    if (!to) return;
    e.preventDefault();
    move(to);
  };

  const shown = active ? parseDay(active) : props.now;
  const weeks = open ? monthGrid(shown.getFullYear(), shown.getMonth()) : [];

  return (
    <div
      ref={pop}
      id={props.id}
      popover="auto"
      class="date-pop"
      role="dialog"
      aria-label={`Deadline for “${props.of}”`}
      onBeforeToggle={(e) => {
        if (e.newState === 'open') {
          place();
          setActive(props.value ?? today);
          setOpen(true);
        } else {
          setOpen(false);
        }
      }}
      onToggle={(e) => {
        // Rendered while still hidden, so focus the day once it's showing.
        if (e.newState === 'open') pop.current?.querySelector<HTMLElement>('[tabindex="0"]')?.focus();
      }}
      onKeyDown={onKeyDown}
    >
      {open && (
        <>
          <div class="date-pop-head">
            <span class="date-pop-month" aria-live="polite">
              {monthHeading(shown)}
            </span>
            <button
              type="button"
              class="icon-btn"
              aria-label="Previous month"
              onClick={() => setActive(addMonths(active, -1))}
            >
              <ChevronIcon dir="left" />
            </button>
            <button type="button" class="icon-btn" aria-label="Next month" onClick={() => setActive(addMonths(active, 1))}>
              <ChevronIcon dir="right" />
            </button>
          </div>
          <table class="date-pop-grid">
            <thead>
              <tr>
                {WEEKDAYS.map((w) => (
                  <th key={w} scope="col">
                    {w}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weeks.map((week) => (
                <tr key={week[0]!.date}>
                  {week.map((d) => (
                    <td key={d.date}>
                      <button
                        type="button"
                        class={`date-pop-day ${d.inMonth ? '' : 'outside'} ${d.date === today ? 'today' : ''}`}
                        data-date={d.date}
                        tabIndex={d.date === active ? 0 : -1}
                        aria-pressed={d.date === props.value}
                        aria-current={d.date === today ? 'date' : undefined}
                        aria-label={fullDay.format(parseDay(d.date))}
                        onClick={() => pick(d.date)}
                      >
                        {d.day}
                      </button>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <div class="date-pop-foot">
            <button type="button" class="btn quiet small" onClick={() => pick(today)}>
              Today
            </button>
            {props.value && (
              <button type="button" class="btn quiet small" onClick={() => pick(undefined)}>
                Clear
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
