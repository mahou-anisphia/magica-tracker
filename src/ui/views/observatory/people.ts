import { allocation, stats, type Allocation, type Stats } from '../../../core/progress';
import type { Root } from '../../../core/schema';
import { escalations, fileAgeDays, type EscalationRef, type Member, type Team } from '../../../core/team';

/** One row of the Observatory: you (live) or a member (from their latest file, if any). */
export type Person = {
  key: string;
  name: string;
  /** Null for you. */
  member: Member | null;
  /** What we know: null when a member hasn't sent a file yet. */
  data: { allocation: Allocation; stats: Stats; escalations: EscalationRef[]; fileAge: number | null } | null;
};

function read(root: Root, now: Date, fileAge: number | null): NonNullable<Person['data']> {
  return { allocation: allocation(root, now), stats: stats(root, now), escalations: escalations(root), fileAge };
}

export function people(mine: Root, team: Team, now: Date): Person[] {
  return [
    { key: 'you', name: 'You', member: null, data: read(mine, now, null) },
    ...team.members.map((m) => ({
      key: m.id,
      name: m.name,
      member: m,
      data: m.snapshot ? read(m.snapshot.root, now, fileAgeDays(m, now)) : null,
    })),
  ];
}

export const isPastLimit = (p: Person) => !!p.data && p.data.allocation.total > p.data.allocation.maxLoad;
