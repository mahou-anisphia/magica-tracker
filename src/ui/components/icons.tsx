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

export function SparkIcon(props: { size?: number }) {
  const s = props.size ?? 14;
  return (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true">
      <path d="M7 1.5l1.3 3.7L12 6.5 8.3 7.8 7 11.5 5.7 7.8 2 6.5l3.7-1.3L7 1.5z" stroke-linejoin="round" />
      <path d="M12.5 10.5l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6.6-1.4z" stroke-linejoin="round" />
    </svg>
  );
}

export function ChevronIcon(props: { dir: 'left' | 'right' | 'down' }) {
  const d = { left: 'M10 3 5 8l5 5', right: 'M6 3l5 5-5 5', down: 'M3 6l5 5 5-5' }[props.dir];
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
      <path d={d} stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  );
}

export function PlusIcon(props: { size?: number }) {
  const s = props.size ?? 14;
  return (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <path d="M8 3v10M3 8h10" stroke-linecap="round" />
    </svg>
  );
}

export function CheckIcon(props: { size?: number }) {
  const s = props.size ?? 14;
  return (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <path d="M3 8.5l3 3 7-7" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  );
}

export function TrashIcon(props: { size?: number }) {
  const s = props.size ?? 14;
  return (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true">
      <path d="M2.5 4.5h11M6.5 4.5V3a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v1.5M4 4.5l.7 8.6a1 1 0 0 0 1 .9h4.6a1 1 0 0 0 1-.9l.7-8.6" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  );
}

export function ArchiveIcon(props: { size?: number }) {
  const s = props.size ?? 14;
  return (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true">
      <rect x="2" y="2.5" width="12" height="3.5" rx="1" />
      <path d="M3 6v6.5a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V6M6.5 9h3" stroke-linecap="round" />
    </svg>
  );
}

/** Send to backlog: a tray with an arrow going in. */
export function TrayIcon(props: { size?: number }) {
  const s = props.size ?? 14;
  return (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true">
      <path d="M2 9.5h3l1 2h4l1-2h3M2 9.5V13a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V9.5M8 2v6M5.5 5.5 8 8l2.5-2.5" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  );
}

/** Opens in a new tab. */
export function ExternalIcon(props: { size?: number }) {
  const s = props.size ?? 12;
  return (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
      <path d="M6 3H3.5A1.5 1.5 0 0 0 2 4.5v8A1.5 1.5 0 0 0 3.5 14h8a1.5 1.5 0 0 0 1.5-1.5V10M9 2h5v5M14 2 7.5 8.5" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  );
}

/** Theme: a painter's palette. */
export function PaletteIcon(props: { size?: number }) {
  const s = props.size ?? 14;
  return (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true">
      <path d="M8 2a6 6 0 1 0 0 12c.9 0 1.4-.6 1.4-1.3 0-.4-.2-.7-.4-1-.3-.3-.4-.6-.4-1 0-.7.6-1.2 1.3-1.2h1.4A2.7 2.7 0 0 0 14 6.8C14 4.1 11.3 2 8 2z" stroke-linejoin="round" />
      <circle cx="5" cy="7.5" r=".8" fill="currentColor" stroke="none" />
      <circle cx="7.5" cy="5" r=".8" fill="currentColor" stroke="none" />
      <circle cx="10.5" cy="5.5" r=".8" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** The brand mark: a small glowing orb. */
export function Orb() {
  return <span class="orb" aria-hidden="true" />;
}
