import type { BacklogItem, Project, Resource, Root, Subtask, Task } from './schema';
import { DAY_MS, localDateStamp } from './time';

/**
 * Sample data for seeing how the tracker looks when it's lived in. Every id
 * starts with SAMPLE_PREFIX, so the samples can be wiped later without
 * touching anything you made yourself. Dates are relative to `now`, so the
 * Timeline and Needs attention always have something to show.
 */

export const SAMPLE_PREFIX = 'sample-';

export const isSampleId = (id: string) => id.startsWith(SAMPLE_PREFIX);

export function hasSample(root: Root): boolean {
  return (
    root.backlog.some((b) => isSampleId(b.id)) ||
    root.projects.some((p) => isSampleId(p.id) || p.tasks.some((t) => isSampleId(t.id)))
  );
}

/** Remove every sample project, task and backlog item; leave everything else as it is. */
export function removeSample(root: Root): Root {
  return {
    ...root,
    projects: root.projects
      .filter((p) => !isSampleId(p.id))
      .map((p) => (p.tasks.some((t) => isSampleId(t.id)) ? { ...p, tasks: p.tasks.filter((t) => !isSampleId(t.id)) } : p)),
    backlog: root.backlog.filter((b) => !isSampleId(b.id)),
  };
}

/** Add the samples after your own data. Loading twice replaces the first set. */
export function addSample(root: Root, now: Date): Root {
  const sample = sampleData(now);
  const base = removeSample(root);
  return { ...base, projects: [...base.projects, ...sample.projects], backlog: [...base.backlog, ...sample.backlog] };
}

export function sampleData(now: Date): { projects: Project[]; backlog: BacklogItem[] } {
  let seq = 0;
  const id = (kind: string) => `${SAMPLE_PREFIX}${kind}-${++seq}`;
  /** An instant `days` ago (negative: in the future), as stored timestamps are. */
  const ago = (days: number) => new Date(now.getTime() - days * DAY_MS).toISOString();
  /** A calendar day `days` from today, as deadlines are. */
  const inDays = (days: number) => localDateStamp(new Date(now.getFullYear(), now.getMonth(), now.getDate() + days));

  const sub = (title: string, opts: { doneDaysAgo?: number; due?: number } = {}): Subtask => ({
    id: id('sub'),
    title,
    done: opts.doneDaysAgo !== undefined,
    ...(opts.doneDaysAgo !== undefined ? { doneAt: ago(opts.doneDaysAgo) } : {}),
    ...(opts.due !== undefined ? { due: inDays(opts.due) } : {}),
  });

  const res = (header: string, path: string, note?: string): Resource => ({
    id: id('res'),
    header,
    url: `https://example.com/${path}`,
    ...(note ? { note } : {}),
    addedAt: ago(5),
  });

  const task = (
    title: string,
    opts: {
      touched?: number;
      due?: number;
      doneDaysAgo?: number;
      notes?: string;
      subtasks?: Subtask[];
      resources?: Resource[];
    } = {},
  ): Task => {
    const subtasks = opts.subtasks ?? [];
    // Mirror the completion rule so the sample is already consistent.
    const done = subtasks.length ? subtasks.every((s) => s.done) : opts.doneDaysAgo !== undefined;
    return {
      id: id('task'),
      title,
      done,
      ...(done ? { doneAt: ago(opts.doneDaysAgo ?? 1) } : {}),
      ...(opts.due !== undefined ? { due: inDays(opts.due) } : {}),
      ...(opts.notes ? { notes: opts.notes } : {}),
      createdAt: ago(30),
      updatedAt: ago(opts.touched ?? opts.doneDaysAgo ?? 1),
      subtasks,
      resources: opts.resources ?? [],
    };
  };

  const project = (
    name: string,
    tasks: Task[],
    opts: { description?: string; due?: number; archived?: boolean; resources?: Resource[] } = {},
  ): Project => ({
    id: id('project'),
    name,
    ...(opts.description ? { description: opts.description } : {}),
    archived: opts.archived ?? false,
    ...(opts.due !== undefined ? { due: inDays(opts.due) } : {}),
    createdAt: ago(40),
    updatedAt: ago(1),
    tasks,
    resources: opts.resources ?? [],
  });

  const observatory = project(
    'Moonwell Observatory',
    [
      task('Calibrate the astrolabe', {
        touched: 0,
        subtasks: [
          sub('Polish the brass rete', { doneDaysAgo: 3 }),
          sub('Align the sights with Polaris', { doneDaysAgo: 1 }),
          sub('Record the first lunar transit', { due: 5 }),
        ],
        resources: [res('Autumn star chart', 'charts/autumn-star-chart', 'The one with the corrected Pleiades.')],
      }),
      task('Catalogue the falling stars', { touched: 2, due: 0 }),
      task('Replace the cracked scrying lens', { touched: 10, notes: 'The glassblower in the lower town owes us a favour.' }),
      task('Sweep stardust from the dome', { doneDaysAgo: 4 }),
    ],
    {
      description: 'Charting the lunar tides from the north tower.',
      due: 12,
      resources: [res('Tower maintenance log', 'observatory/maintenance-log')],
    },
  );

  const workshop = project(
    'Potion Workshop',
    [
      task('Brew a calming draught', {
        touched: 1,
        subtasks: [
          sub('Gather moonpetal at dusk', { doneDaysAgo: 2 }),
          sub('Steep for three nights', { due: -1 }),
          sub('Bottle and label', { due: 6 }),
        ],
      }),
      task('Order a dragon-scale crucible', {
        touched: 3,
        due: -2,
        resources: [res('Crucible supplier', 'suppliers/dragon-scale-crucibles', 'Ask about the heat-warded lids.')],
      }),
      task('Write up the elixir recipes', {
        touched: 14,
        resources: [res('Recipe grimoire, draft', 'grimoire/elixir-recipes-draft')],
      }),
      task('Inventory the herb cabinet', { doneDaysAgo: 3 }),
      task('Season the new cauldron', { doneDaysAgo: 6 }),
    ],
    { description: 'Restocking the apothecary before the winter solstice.', due: 3 },
  );

  const familiars = project(
    'Familiar Registry',
    [
      task('Register the new owl', { touched: 2, due: 6, notes: 'Answers to Wren. Prefers mice to biscuits.' }),
      task("Build the cat's reading nook", {
        touched: 4,
        subtasks: [
          sub('Find a sunny windowsill', { doneDaysAgo: 4 }),
          sub('Stitch the velvet cushion'),
          sub('Enchant it to stay warm', { due: 20 }),
        ],
      }),
      task('Feeding schedule for the toads', { doneDaysAgo: 2 }),
    ],
    { description: 'Who lives in the tower, and what they eat.' },
  );

  const grimoire = project(
    'Grimoire Restoration',
    [
      task('Rebind volume III', {
        touched: 1,
        due: 9,
        resources: [res('Coptic binding guide', 'guides/coptic-binding')],
      }),
      task('Translate the marginalia', { touched: 8 }),
      task('Index the sealed chapter', {
        touched: 2,
        due: 25,
        subtasks: [sub('Break the wax seal, carefully'), sub('Copy the sigils'), sub('Return it to the vault')],
      }),
    ],
    { description: 'Rebinding the old spellbooks from the east library.', due: 30 },
  );

  const wands = project(
    'Wand Inventory',
    [task('Count the yew wands', { doneDaysAgo: 60 }), task('Restring the willow wands', { doneDaysAgo: 58 })],
    { description: 'Finished last season.', archived: true },
  );

  const idea = (title: string, opts: { notes?: string; suggested?: Project; daysAgo?: number } = {}): BacklogItem => ({
    id: id('idea'),
    title,
    ...(opts.notes ? { notes: opts.notes } : {}),
    ...(opts.suggested ? { suggestedProjectId: opts.suggested.id } : {}),
    createdAt: ago(opts.daysAgo ?? 3),
    updatedAt: ago(opts.daysAgo ?? 3),
  });

  return {
    projects: [observatory, workshop, familiars, grimoire, wands],
    backlog: [
      idea('Learn to read tea leaves', { notes: 'Start with the chipped blue cup.', daysAgo: 9 }),
      idea('Enchanted irrigation for the herb garden', { suggested: workshop, daysAgo: 5 }),
      idea('Host a starlight market on the solstice', { daysAgo: 2 }),
      idea('Repair the flying broom', { notes: 'The bristles keep steering left.', suggested: familiars, daysAgo: 1 }),
    ],
  };
}
