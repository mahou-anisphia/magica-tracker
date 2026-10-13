/** A tile's value: a main line, an optional quieter line under it, or "+ Add" when there's nothing yet. */
export function TileValue(props: { main?: string; sub?: string; add?: string }) {
  if (!props.main) return <span class="text-14 text-faint">+ {props.add ?? 'Add'}</span>;
  return (
    <>
      <span class="truncate text-14 font-semibold text-ink">{props.main}</span>
      {props.sub && <span class="truncate text-12 text-body">{props.sub}</span>}
    </>
  );
}
