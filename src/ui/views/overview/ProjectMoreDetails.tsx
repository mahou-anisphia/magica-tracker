import { useId, useState } from 'preact/hooks';
import * as ops from '../../../core/ops';
import type { Project } from '../../../core/schema';
import { update } from '../../store';
import { DetailField } from './DetailField';
import { DetailTile } from './DetailTile';
import { MoreDetails } from './MoreDetails';
import { TileValue } from './TileValue';

type Tile = 'done' | 'people';

/** A project's definition of done and related people, folded away as two tiles. */
export function ProjectMoreDetails(props: { project: Project }) {
  const p = props.project;
  const [open, setOpen] = useState<Tile | null>(null);
  const editorId = `project-tile-${useId()}`;
  const tile = (id: Tile) => ({ open: open === id, controls: editorId, onToggle: () => setOpen(open === id ? null : id) });
  const summary = [p.definitionOfDone && 'Definition of done', p.relatedPeople && 'Related people'].filter(
    (x): x is string => !!x,
  );
  return (
    <MoreDetails summary={summary}>
      <div class="grid grid-cols-4 gap-10 max-md:grid-cols-2">
        <DetailTile label="Definition of done" tone={p.definitionOfDone ? 'set' : 'empty'} {...tile('done')}>
          <TileValue main={p.definitionOfDone} />
        </DetailTile>
        <DetailTile label="Related people" tone={p.relatedPeople ? 'set' : 'empty'} {...tile('people')}>
          <TileValue main={p.relatedPeople} />
        </DetailTile>
      </div>
      {open && (
        <div id={editorId} class="grid grid-cols-1 gap-10 rounded-12 border border-line bg-card px-14 py-12">
          {open === 'done' ? (
            <DetailField
              label="Definition of done"
              value={p.definitionOfDone}
              placeholder="Done when…"
              multiline
              onSave={(text) => update((r, n) => ops.setProjectText(r, p.id, 'definitionOfDone', text, n))}
            />
          ) : (
            <DetailField
              label="Related people"
              value={p.relatedPeople}
              placeholder="Who to contact"
              onSave={(text) => update((r, n) => ops.setProjectText(r, p.id, 'relatedPeople', text, n))}
            />
          )}
        </div>
      )}
    </MoreDetails>
  );
}
