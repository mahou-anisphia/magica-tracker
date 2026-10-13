import type { Root } from '../../../core/schema';
import { fileVerdict, isOwnFile, suggestedName, type Team } from '../../../core/team';
import type { TeamImportRow } from '../../store';

export type Outcome = { text: string; tone: 'good' | 'plain' | 'warn' };

/** What importing one row would do, in a few words. Only 'good' rows change anything. */
export function importOutcome(row: TeamImportRow, team: Team, mine: Root): Outcome {
  const { read, assign } = row;
  if (!read.ok) return { text: 'Can’t be read', tone: 'warn' };
  if (assign === 'skip') return { text: isOwnFile(mine, read.file) ? 'Your own file: skipped' : 'Skipped', tone: 'plain' };
  if (assign === '') return { text: 'Choose who this is', tone: 'warn' };
  if (assign === 'new') return { text: `Adds ${suggestedName(read.file)} to the team`, tone: 'good' };
  const member = team.members.find((m) => m.id === assign);
  switch (fileVerdict(member, read.file)) {
    case 'first':
      return { text: `First file for ${member?.name}`, tone: 'good' };
    case 'newer':
      return { text: 'Newer: replaces their copy', tone: 'good' };
    case 'same':
      return { text: 'Same as their copy: skipped', tone: 'plain' };
    case 'older':
      return { text: 'Older than theirs: skipped', tone: 'plain' };
  }
}
