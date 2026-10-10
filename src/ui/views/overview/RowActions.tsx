import type { ComponentChildren } from 'preact';

/** Edit and remove on sub-tasks, resources and backlog items: always there, small and muted. */
export function RowActions(props: { children: ComponentChildren }) {
  return <div class="flex flex-none gap-2">{props.children}</div>;
}

export function RowAction(props: { label: string; title: string; onClick: () => void; children: ComponentChildren }) {
  return (
    <button
      type="button"
      class="icon-btn text-faint hover:text-primary-ink focus-visible:text-primary-ink"
      aria-label={props.label}
      title={props.title}
      onClick={props.onClick}
    >
      {props.children}
    </button>
  );
}
