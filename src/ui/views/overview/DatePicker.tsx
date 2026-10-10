import type { RefObject } from 'preact';
import { useLayoutEffect, useRef, useState } from 'preact/hooks';
import { monthGrid } from '../../../core/calendar';
import { monthHeading } from '../../../core/format';
import { localDateStamp } from '../../../core/time';
import { ChevronIcon } from '../../components/icons';
import { placePopover, useFollowAnchor } from '../../components/placePopover';

const weekdayShort = new Intl.DateTimeFormat(undefined, { weekday: 'short' });
const fullDay = new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
// 2024-01-01 was a Monday.
const WEEKDAYS = Array.from({ length: 7 }, (_, i) => weekdayShort.format(new Date(2024, 0, 1 + i)));

/** Estimated tallest picker (six weeks), for choosing above or below. */
const MAX_HEIGHT = 360;

const parseDay = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y!, m! - 1, d!);
};

/** Today: an accent ring. The chosen day: filled primary, like Timeline's today. */
function dayClass(opts: { chosen: boolean; today: boolean; inMonth: boolean }): string {
  if (opts.chosen) return 'bg-primary font-semibold text-on-primary hover:bg-primary-hover';
  if (opts.today) return 'font-semibold text-primary-ink inset-ring-[1.5px] inset-ring-accent hover:bg-primary-tint';
  const tone = opts.inMonth ? 'font-medium text-ink' : 'font-normal text-faint';
  return `${tone} hover:bg-primary-tint hover:text-primary-ink`;
}

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
  const place = () => placePopover(pop.current, props.anchor.current, { width: 284, maxHeight: MAX_HEIGHT, align: 'end' });
  useFollowAnchor(open, place);

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
      // A white card in the top layer, so no overflow clips it. place() sets
      // top/bottom/left from the button it belongs to.
      class="fixed inset-auto m-0 w-[min(284px,calc(100vw-16px))] rounded-14 border border-line bg-card px-12 pt-12 pb-8 text-ink shadow-pop open:animate-pop"
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
          <div class="mb-6 flex items-center gap-2 pl-6">
            <span class="flex-1 text-15 font-semibold" aria-live="polite">
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
          <table class="w-full table-fixed border-collapse">
            <thead>
              <tr>
                {WEEKDAYS.map((w) => (
                  <th key={w} scope="col" class="pt-4 pb-6 text-center text-11 font-medium text-body">
                    {w}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weeks.map((week) => (
                <tr key={week[0]!.date}>
                  {week.map((d) => (
                    <td key={d.date} class="p-1 text-center">
                      <button
                        type="button"
                        class={`inline-grid h-34 w-34 max-w-full cursor-pointer place-items-center rounded-full p-0 text-13 tabular-nums transition-[background-color,color] duration-120 pointer-coarse:h-40 pointer-coarse:w-40 ${dayClass({ chosen: d.date === props.value, today: d.date === today, inMonth: d.inMonth })}`}
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
          <div class="mt-6 flex justify-between border-t border-line pt-6">
            <button type="button" class="btn btn-quiet btn-small" onClick={() => pick(today)}>
              Today
            </button>
            {props.value && (
              <button type="button" class="btn btn-quiet btn-small" onClick={() => pick(undefined)}>
                Clear
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
