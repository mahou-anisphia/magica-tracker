import * as ops from '../../../core/ops';
import type { Project } from '../../../core/schema';
import { update } from '../../store';
import { DetailField } from './DetailField';
import { DetailRows } from './DetailRows';
import { MoreDetails } from './MoreDetails';

/** A project's definition of done and related people, folded away. */
export function ProjectMoreDetails(props: { project: Project }) {
  const p = props.project;
  const summary = [p.definitionOfDone && 'Definition of done', p.relatedPeople && 'Related people'].filter(
    (x): x is string => !!x,
  );
  return (
    <MoreDetails summary={summary}>
      <DetailRows>
        <DetailField
          label="Definition of done"
          value={p.definitionOfDone}
          placeholder="Done when…"
          multiline
          onSave={(text) => update((r, n) => ops.setProjectText(r, p.id, 'definitionOfDone', text, n))}
        />
        <DetailField
          label="Related people"
          value={p.relatedPeople}
          placeholder="Who to contact"
          onSave={(text) => update((r, n) => ops.setProjectText(r, p.id, 'relatedPeople', text, n))}
        />
      </DetailRows>
    </MoreDetails>
  );
}
