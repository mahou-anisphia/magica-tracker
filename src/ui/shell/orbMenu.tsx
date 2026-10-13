import type { JSX } from 'preact';
import { BoardIcon, GearIcon, TeamIcon, TelescopeIcon } from '../components/icons';
import { go } from '../store';

/** Something the orb can do, with the one-line explanation it shows beside it. */
export type OrbAction = {
  id: string;
  label: string;
  /** The explanation card's heading, e.g. "Adding a member to the team". */
  title: string;
  text: string;
  run: () => void;
};

export type OrbSection = {
  id: string;
  label: string;
  icon: () => JSX.Element;
  /** Clicking the section itself: its screen, nothing highlighted. */
  open: () => void;
  actions: OrbAction[];
};

/**
 * The orb's column, top to bottom. Search sits nearest the orb, then Overview,
 * then Settings; the Board heads the column. 'home' and 'search' are Overview
 * and Search; the rest are section ids. The nearest is the one open when the
 * orb opens.
 */
export const ORB_COLUMN = ['board', 'team', 'observatory', 'settings', 'home', 'search'] as const;

/**
 * The orb's sections. ORB_COLUMN decides where each sits in the column.
 * Each action opens its screen and points at the part to use there.
 * The search palette lists the same actions.
 */
export function orbSections(): OrbSection[] {
  return [
    {
      id: 'settings',
      label: 'Settings',
      icon: () => <GearIcon size={22} />,
      open: () => go('settings'),
      actions: [
        {
          id: 'settings-theme',
          label: 'Change theme',
          title: 'Changing the theme',
          text: 'Pick a theme, and light, dark or follow the system.',
          run: () => go('settings', { key: 'settings-theme' }),
        },
        {
          id: 'settings-alloc',
          label: 'Allocation period',
          title: 'Setting the allocation period',
          text: 'Weekly or fortnightly, and the most you can carry before your team sees “past limit”.',
          run: () => go('settings', { key: 'settings-alloc' }),
        },
        {
          id: 'settings-profile',
          label: 'Your name',
          title: 'Naming yourself',
          text: 'The name on your exports, so your team can match your file to you.',
          run: () => go('settings', { key: 'settings-profile', hint: 'Type your name' }),
        },
        {
          id: 'settings-data',
          label: 'Storage and backup',
          title: 'Storage and backup',
          text: 'Where your data lives, the export reminder, and wiping this browser.',
          run: () => go('settings', { key: 'settings-data' }),
        },
      ],
    },
    {
      id: 'observatory',
      label: 'Observatory',
      icon: () => <TelescopeIcon size={22} />,
      open: () => go('observatory'),
      actions: [
        {
          id: 'obs-load',
          label: 'Who is past their limit',
          title: 'Seeing everyone’s load',
          text: 'Each person’s allocation this period against the limit they set, from their latest file.',
          run: () => go('observatory', { key: 'obs-load' }),
        },
        {
          id: 'obs-escalate',
          label: 'Escalation flags',
          title: 'What may be escalated to you',
          text: 'Tasks people flagged “I may be escalated”, with who might escalate and why.',
          run: () => go('observatory', { key: 'obs-escalate' }),
        },
      ],
    },
    {
      id: 'team',
      label: 'Team',
      icon: () => <TeamIcon size={22} />,
      open: () => go('team'),
      actions: [
        {
          id: 'team-add',
          label: 'Add member',
          title: 'Adding a member to the team',
          text: 'Add one person at a time by name. Their data arrives later, from the file they export.',
          run: () => go('team', { key: 'team-add', hint: 'Start here' }),
        },
        {
          id: 'team-update',
          label: 'Update member',
          title: 'Updating a member',
          text: 'Rename someone, change their role, or remove them from the team.',
          run: () => go('team', { key: 'team-members', hint: 'Pick someone to update' }),
        },
        {
          id: 'team-view',
          label: 'View as…',
          title: 'Seeing their tracker',
          text: 'Open someone’s tracker as they see it, from their latest file. Read-only.',
          run: () => go('team', { key: 'team-members', hint: 'Pick whose view' }),
        },
        {
          id: 'team-import',
          label: 'Import their files',
          title: 'Importing their files',
          text: 'Bring in the files people exported. Each is matched to a person and kept read-only.',
          run: () => go('team', { key: 'team-import', hint: 'Start here' }),
        },
      ],
    },
    {
      id: 'board',
      label: 'Board',
      icon: () => <BoardIcon size={22} />,
      open: () => go('board'),
      actions: [
        {
          id: 'board-waiting',
          label: 'What’s waiting',
          title: 'What you’re waiting on',
          text: 'Every task waiting on a person, a meeting or evidence, with how long it has waited.',
          run: () => go('board', { key: 'board-waiting', hint: 'Chase these' }),
        },
        {
          id: 'board-due',
          label: 'Due soon',
          title: 'Today at a glance',
          text: 'What’s overdue, due in the next three days, urgent, and waiting.',
          run: () => go('board', { key: 'board-strip' }),
        },
        {
          id: 'board-move',
          label: 'Move a task along',
          title: 'Moving a task',
          text: 'Hold a card and drag it to another column, or up and down to reorder. Click it for the rest.',
          run: () => go('board', { key: 'board-lanes', hint: 'Drag a card' }),
        },
      ],
    },
  ];
}
