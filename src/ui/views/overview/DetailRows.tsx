import type { ComponentChildren } from 'preact';

/**
 * The grid inside "More details": labels in a narrow column on the left, every
 * control the same width on the right. Below 720px each label sits above its
 * control.
 */
export function DetailRows(props: { children: ComponentChildren }) {
  return (
    <div class="grid grid-cols-[140px_minmax(0,1fr)] items-start gap-x-16 gap-y-12 max-md:grid-cols-1 max-md:gap-y-4">
      {props.children}
    </div>
  );
}
