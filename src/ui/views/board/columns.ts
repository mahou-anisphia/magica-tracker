import type { Status } from '../../../core/schema';

/** The board's columns, left to right, and its grid: the lane name, then one track per column. */
export const COLUMNS: { status: Status; label: string }[] = [
  { status: 'todo', label: 'To do' },
  { status: 'working', label: 'Working' },
  { status: 'waiting', label: 'Waiting' },
  { status: 'done', label: 'Done, last 7 days' },
];

export const GRID = 'grid grid-cols-[180px_repeat(4,minmax(0,1fr))] max-md:grid-cols-1';
