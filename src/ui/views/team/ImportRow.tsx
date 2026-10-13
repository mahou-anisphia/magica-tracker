import { plural, shortDay } from '../../../core/format';
import type { Root } from '../../../core/schema';
import { matchMember, suggestedName, type Team } from '../../../core/team';
import { counts } from '../../../core/validate';
import { assignTeamFile } from '../../actions';
import type { TeamImportRow } from '../../store';
import { importOutcome } from './importOutcome';

const TONE = { good: 'pill-high', plain: 'pill-low', warn: 'pill-watch' } as const;

/** One file: what it holds, whose it is (changeable), and what importing does with it. */
export function ImportRow(props: { row: TeamImportRow; team: Team; mine: Root }) {
  const { row, team } = props;
  const { read } = row;
  const outcome = importOutcome(row, team, props.mine);
  const match = read.ok ? matchMember(team, read.file.root) : null;
  const c = read.ok ? counts(read.file.root) : null;
  const fileName = read.ok ? read.file.fileName : read.fileName;

  return (
    <li class="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1.2fr)_minmax(0,1fr)] items-center gap-16 border-t border-line px-22 py-12 first:border-t-0 max-md:grid-cols-1 max-md:gap-8 max-md:px-16">
      <span class="grid min-w-0 grid-cols-1">
        <span class="truncate font-medium text-ink" title={fileName}>
          {fileName}
        </span>
        <span class="text-12 text-body">
          {read.ok ? `Exported ${shortDay(read.file.exportedAt)} · ${plural(c!.projects, 'project')} · ${plural(c!.tasks, 'task')}` : read.error}
        </span>
      </span>
      {read.ok ? (
        <label class="grid min-w-0 grid-cols-1 gap-2 text-12 text-body">
          <span class="sr-only">Whose file is “{fileName}”?</span>
          <select
            class="min-h-34 w-full rounded-10 border border-line bg-card px-8 text-14 text-ink focus:border-accent focus:outline-none max-lg:min-h-44 max-lg:text-16"
            value={row.assign}
            onChange={(e) => assignTeamFile(row.key, e.currentTarget.value)}
          >
            <option value="">Choose…</option>
            {team.members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
            <option value="new">Add “{suggestedName(read.file)}” to the team</option>
            <option value="skip">Skip this file</option>
          </select>
          {match && match.member.id === row.assign && <span>Matched by {match.by === 'profile' ? 'their profile' : 'the name on it'}</span>}
        </label>
      ) : (
        <span class="text-14 text-faint max-md:hidden">—</span>
      )}
      <span class={`pill ${TONE[outcome.tone]} justify-self-start`}>{outcome.text}</span>
    </li>
  );
}
