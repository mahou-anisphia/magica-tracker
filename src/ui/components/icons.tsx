/** Small line icons drawn in currentColor, so they follow the text around them. */

export function CalendarIcon(props: { size?: number }) {
  const s = props.size ?? 14;
  return (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true">
      <rect x="2" y="3" width="12" height="11" rx="2" />
      <path d="M2 6.5h12M5.5 1.5v3M10.5 1.5v3" stroke-linecap="round" />
    </svg>
  );
}

export function ListIcon(props: { size?: number }) {
  const s = props.size ?? 14;
  return (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true">
      <path d="M5.5 4h8M5.5 8h8M5.5 12h8" stroke-linecap="round" />
      <circle cx="2.5" cy="4" r=".6" fill="currentColor" />
      <circle cx="2.5" cy="8" r=".6" fill="currentColor" />
      <circle cx="2.5" cy="12" r=".6" fill="currentColor" />
    </svg>
  );
}

export function PencilIcon(props: { size?: number }) {
  const s = props.size ?? 14;
  return (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true">
      <path d="M10.5 2.5l3 3L6 13H3v-3l7.5-7.5z" stroke-linejoin="round" />
    </svg>
  );
}

export function CrossIcon(props: { size?: number }) {
  const s = props.size ?? 14;
  return (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
      <path d="M4 4l8 8M12 4l-8 8" stroke-linecap="round" />
    </svg>
  );
}

export function ChevronIcon(props: { dir: 'left' | 'right' }) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
      <path d={props.dir === 'left' ? 'M10 3 5 8l5 5' : 'M6 3l5 5-5 5'} stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  );
}
