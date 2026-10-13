/** Soft fills for initials, picked by name so a person keeps theirs everywhere. */
const TONES = ['bg-primary-tint text-ink', 'bg-chip text-ink', 'bg-watch-tint text-watch-ink', 'bg-primary text-on-primary'] as const;

function toneOf(name: string): string {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return TONES[h % TONES.length]!;
}

/** A person's initial in a circle. */
export function Avatar(props: { name: string; size?: 'small' }) {
  return (
    <span
      class={`inline-flex flex-none items-center justify-center rounded-full font-semibold ${
        props.size === 'small' ? 'size-28 text-13' : 'size-36 text-15'
      } ${toneOf(props.name)}`}
      aria-hidden="true"
    >
      {props.name.trim().charAt(0).toLocaleUpperCase()}
    </span>
  );
}
