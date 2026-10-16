import { ChevronIcon } from './icons';

export type GlanceTone = 'plain' | 'gold';

/** `unit` follows the number at its size ("88%"); `note` follows it small. */
export type GlanceItem = { label: string; value: number; tone: GlanceTone; unit?: string; note?: string; key?: string };

const VALUE: Record<GlanceTone | 'zero', string> = {
  zero: 'text-body',
  plain: 'text-ink',
  gold: 'text-watch-ink',
};

const MARK: Record<GlanceTone | 'zero', string> = {
  zero: '',
  plain: '',
  gold: "before:size-7 before:rounded-full before:bg-watch before:content-['']",
};

const CELL = 'grid grid-cols-1 gap-6 border-line px-26 pt-22 pb-20 max-md:px-18 max-md:py-16';
const LABEL = 'flex items-center gap-8 text-13 font-medium text-body';
const NUMBER = 'm-0 text-28 leading-[1.15] font-medium tracking-[-0.02em] tabular-nums';

/** Hairlines between cells: one row of four, or two rows of two. */
const lines = (i: number) => `${i > 0 ? 'border-l' : ''} ${i % 2 === 0 ? 'max-md:border-l-0' : ''} ${i >= 2 ? 'max-md:border-t' : ''}`;

/**
 * Four numbers divided by hairlines, the top of an "At a glance" card. Gold
 * ones carry the highlight colour, and only when they aren't zero. Below
 * 720px they sit two by two.
 *
 * With `onToggle`, each number is a button that opens the list behind it
 * (`controls` names that list); `open` is the key of the one showing.
 */
export function GlanceNumbers(props: {
  items: GlanceItem[];
  open?: string | null;
  controls?: string;
  onToggle?: (key: string) => void;
}) {
  const { onToggle } = props;
  if (onToggle) {
    return (
      <div class="grid grid-cols-4 max-md:grid-cols-2">
        {props.items.map((it, i) => {
          const tone = it.value > 0 ? it.tone : 'zero';
          const key = it.key ?? it.label;
          // Nothing to list behind a zero.
          const empty = it.value === 0;
          return (
            <button
              key={key}
              type="button"
              class={`group/cell ${CELL} ${lines(i)} text-left focus-visible:-outline-offset-2 ${empty ? '' : 'cursor-pointer hover:not-aria-expanded:bg-page-70'} aria-expanded:bg-primary-tint-45 aria-expanded:shadow-[inset_0_-2px_0_var(--color-accent)]`}
              disabled={empty}
              aria-expanded={empty ? undefined : props.open === key}
              aria-controls={props.controls}
              onClick={() => onToggle(key)}
            >
              <span
                class={`${LABEL} ${MARK[tone]} ${empty ? '' : 'group-hover/cell:text-primary-ink'} group-aria-expanded/cell:text-primary-ink`}
              >
                {it.label}
                {!empty && (
                  <span class="inline-flex transition-transform group-aria-expanded/cell:rotate-180">
                    <ChevronIcon dir="down" />
                  </span>
                )}
              </span>
              <span class={`${NUMBER} ${VALUE[tone]}`}>
                {it.value}
                {it.unit}
                {it.note && <span class="ml-8 text-13 font-normal tracking-normal text-body">{it.note}</span>}
              </span>
            </button>
          );
        })}
      </div>
    );
  }
  return (
    <dl class="m-0 grid grid-cols-4 max-md:grid-cols-2">
      {props.items.map((it, i) => {
        const tone = it.value > 0 ? it.tone : 'zero';
        return (
          <div key={it.label} class={`${CELL} ${lines(i)}`}>
            <dt class={`${LABEL} ${MARK[tone]}`}>{it.label}</dt>
            <dd class={`${NUMBER} ${VALUE[tone]}`}>
              {it.value}
              {it.unit}
              {it.note && <span class="ml-8 text-13 font-normal tracking-normal text-body">{it.note}</span>}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
