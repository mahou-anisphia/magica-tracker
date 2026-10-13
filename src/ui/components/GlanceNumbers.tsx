export type GlanceTone = 'plain' | 'gold';

export type GlanceItem = { label: string; value: number; tone: GlanceTone; note?: string };

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

/**
 * Four numbers divided by hairlines, the top of an "At a glance" card. Gold
 * ones carry the highlight colour, and only when they aren't zero. Below
 * 720px they sit two by two.
 */
export function GlanceNumbers(props: { items: GlanceItem[] }) {
  return (
    <dl class="m-0 grid grid-cols-4 max-md:grid-cols-2">
      {props.items.map((it, i) => {
        const tone = it.value > 0 ? it.tone : 'zero';
        // Hairlines between cells: one row of four, or two rows of two.
        const lines = `${i > 0 ? 'border-l' : ''} ${i % 2 === 0 ? 'max-md:border-l-0' : ''} ${i >= 2 ? 'max-md:border-t' : ''}`;
        return (
          <div key={it.label} class={`grid grid-cols-1 gap-6 border-line px-26 pt-22 pb-20 max-md:px-18 max-md:py-16 ${lines}`}>
            <dt class={`flex items-center gap-8 text-13 font-medium text-body ${MARK[tone]}`}>{it.label}</dt>
            <dd class={`m-0 text-28 leading-[1.15] font-medium tracking-[-0.02em] tabular-nums ${VALUE[tone]}`}>
              {it.value}
              {it.note && <span class="ml-8 text-13 font-normal tracking-normal text-body">{it.note}</span>}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
