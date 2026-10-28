import { allocationHistory, isPastLimit as pastTheirLimit, stats, type Allocation, type Stats } from '../../../core/progress';
import type { CalendarEntry, Root } from '../../../core/schema';
import { localDateStamp } from '../../../core/time';
import { daysOffOn, timesheetFlags, type MonthBalance } from '../../../core/workdays';
import { escalations, fileAgeDays, type EscalationRef, type Member, type Team } from '../../../core/team';

/** One row of the Observatory: you (live) or a member (from their latest file, if any). */
export type Person = {
  key: string;
  name: string;
  /** Null for you. */
  member: Member | null;
  /** What we know: null when a member hasn't sent a file yet. */
  data: {
    allocation: Allocation;
    /** The periods before this one, oldest first, by their own settings (at most HISTORY_PERIODS). */
    history: Allocation[];
    stats: Stats;
    escalations: EscalationRef[];
    fileAge: number | null;
    /** Timesheet months that don't add up, oldest first (none without a timesheet). */
    timesheet: MonthBalance[];
    /** Their leave or holiday today, if any. */
    offToday: CalendarEntry | undefined;
  } | null;
};

/** How many past periods each row shows. */
export const HISTORY_PERIODS = 5;

function read(root: Root, now: Date, fileAge: number | null): NonNullable<Person['data']> {
  const periods = allocationHistory(root, now, HISTORY_PERIODS + 1);
  return {
    allocation: periods.at(-1)!,
    history: periods.slice(0, -1),
    stats: stats(root, now),
    escalations: escalations(root),
    fileAge,
    timesheet: timesheetFlags(root, now),
    offToday: daysOffOn(root, localDateStamp(now))[0],
  };
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

export const isPastLimit = (p: Person) => !!p.data && pastTheirLimit(p.data.allocation);

/** How many of their past periods went past their limit. */
export const pastLimitBefore = (p: Person) => p.data?.history.filter(pastTheirLimit).length ?? 0;
