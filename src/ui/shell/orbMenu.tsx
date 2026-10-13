import type { JSX } from 'preact';
import { GearIcon } from '../components/icons';
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
 * The orb's sections, in the order they stack above it (the last sits nearest
 * the orb). Each action opens its screen and points at the part to use there.
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
  ];
}
