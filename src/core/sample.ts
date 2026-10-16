import { SCHEMA_VERSION, type AllocationSettings, type BacklogItem, type Priority, type Project, type Resource, type Root, type Subtask, type Task } from './schema';
import type { Member, Team } from './team';
import { DAY_MS, localDateStamp } from './time';

/**
 * Sample data for seeing how the tracker looks when it's lived in. Every id
 * starts with SAMPLE_PREFIX, so the samples can be wiped later without
 * touching anything you made yourself. Dates are relative to `now`, so the
 * Timeline and Needs attention always have something to show. A few sample
 * teammates come too (in the team, never in your own data), so Team, View as
 * and the Observatory have someone to show.
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

/** Builders for sample records. `scope` keeps a teammate's ids apart from yours. */
function makers(now: Date, scope: string) {
  let seq = 0;
  const id = (kind: string) => `${SAMPLE_PREFIX}${scope}${kind}-${++seq}`;
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
      priority?: Priority;
      effort?: number;
      subtasks?: Subtask[];
      resources?: Resource[];
      /** The v3 fields, as given. */
      extra?: Partial<Pick<Task, 'definitionOfDone' | 'relatedPeople' | 'waiting' | 'escalation' | 'startsOn'>>;
      /** Working on it with no sub-task done yet. */
      working?: boolean;
    } = {},
  ): Task => {
    const subtasks = opts.subtasks ?? [];
    // Mirror the completion rule so the sample is already consistent.
    const done = subtasks.length ? subtasks.every((s) => s.done) : opts.doneDaysAgo !== undefined;
    const status: Task['status'] = done
      ? 'done'
      : opts.extra?.waiting
        ? 'waiting'
        : opts.working || subtasks.some((s) => s.done)
          ? 'working'
          : 'todo';
    return {
      id: id('task'),
      title,
      done,
      status,
      ...(done ? { doneAt: ago(opts.doneDaysAgo ?? 1) } : {}),
      ...(opts.due !== undefined ? { due: inDays(opts.due) } : {}),
      ...(opts.priority ? { priority: opts.priority } : {}),
      ...(opts.effort !== undefined ? { effort: opts.effort } : {}),
      ...(opts.notes ? { notes: opts.notes } : {}),
      ...opts.extra,
      createdAt: ago(30),
      updatedAt: ago(opts.touched ?? opts.doneDaysAgo ?? 1),
      subtasks,
      resources: opts.resources ?? [],
    };
  };

  const project = (
    name: string,
    tasks: Task[],
    opts: { description?: string; due?: number; archived?: boolean; doneDaysAgo?: number; resources?: Resource[] } = {},
  ): Project => ({
    id: id('project'),
    name,
    ...(opts.description ? { description: opts.description } : {}),
    archived: opts.archived ?? false,
    ...(opts.doneDaysAgo !== undefined ? { doneAt: ago(opts.doneDaysAgo) } : {}),
    ...(opts.due !== undefined ? { due: inDays(opts.due) } : {}),
    createdAt: ago(40),
    updatedAt: ago(1),
    tasks,
    resources: opts.resources ?? [],
  });

  return { id, ago, inDays, sub, res, task, project };
}

export function sampleData(now: Date): { projects: Project[]; backlog: BacklogItem[] } {
  const { id, ago, inDays, sub, res, task, project } = makers(now, '');

  const observatory = project(
    'Moonwell Observatory',
    [
      task('Calibrate the astrolabe', {
        touched: 0,
        priority: 'high',
        effort: 35,
        subtasks: [
          sub('Polish the brass rete', { doneDaysAgo: 3 }),
          sub('Align the sights with Polaris', { doneDaysAgo: 1 }),
          sub('Record the first lunar transit', { due: 5 }),
        ],
        resources: [res('Autumn star chart', 'charts/autumn-star-chart', 'The one with the corrected Pleiades.')],
        extra: {
          definitionOfDone: 'Reads within a degree of the Polaris check, twice in a row.',
          relatedPeople: 'Bram (optics); the lens maker in Harrow',
        },
      }),
      task('Catalogue the falling stars', { touched: 2, due: 0, effort: 5 }),
      task('Replace the cracked scrying lens', {
        touched: 10,
        effort: 10,
        priority: 'low',
        notes: 'The glassblower in the lower town owes us a favour.',
        extra: {
          waiting: { since: ago(3), on: 'New glass from the lower town' },
          escalation: { since: ago(2), by: 'Archive team', why: 'Their star survey depends on the lens.' },
        },
      }),
      task("Chart the comet's return", {
        touched: 1,
        due: 19,
        effort: 15,
        notes: 'Last seen over the east ridge, eleven years ago.',
        subtasks: [sub('Dig out the old sightings', { doneDaysAgo: 1 }), sub('Plot the orbit'), sub('Warn the village')],
      }),
      task('Oil the dome hinges', { touched: 9 }),
      task('Sweep stardust from the dome', { doneDaysAgo: 4 }),
      task('Fit the new eyepiece', { doneDaysAgo: 11 }),
      task('Map the winter constellations', { doneDaysAgo: 17, due: -16, effort: 40 }),
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
        priority: 'urgent',
        effort: 20,
        subtasks: [
          sub('Gather moonpetal at dusk', { doneDaysAgo: 2 }),
          sub('Steep for three nights', { due: -1 }),
          sub('Bottle and label', { due: 6 }),
        ],
      }),
      task('Order a dragon-scale crucible', {
        touched: 3,
        due: -2,
        priority: 'high',
        effort: 15,
        resources: [res('Crucible supplier', 'suppliers/dragon-scale-crucibles', 'Ask about the heat-warded lids.')],
      }),
      task('Write up the elixir recipes', {
        touched: 14,
        effort: 10,
        resources: [res('Recipe grimoire, draft', 'grimoire/elixir-recipes-draft')],
      }),
      task('Label the poison shelf, clearly', { touched: 0, due: 2, priority: 'medium' }),
      task('Distil rosewater for the market', { touched: 5, due: 33 }),
      task('Inventory the herb cabinet', { doneDaysAgo: 3 }),
      task('Season the new cauldron', { doneDaysAgo: 6 }),
      task('Brew the harvest tonics', { doneDaysAgo: 24, due: -27, effort: 55 }),
    ],
    { description: 'Restocking the apothecary before the winter solstice.', due: 3 },
  );

  const familiars = project(
    'Familiar Registry',
    [
      task('Register the new owl', { touched: 2, due: 6, priority: 'medium', effort: 5, notes: 'Answers to Wren. Prefers mice to biscuits.' }),
      task("Build the cat's reading nook", {
        touched: 4,
        effort: 10,
        subtasks: [
          sub('Find a sunny windowsill', { doneDaysAgo: 4 }),
          sub('Stitch the velvet cushion'),
          sub('Enchant it to stay warm', { due: 20 }),
        ],
      }),
      task('Teach the raven to fetch letters', {
        touched: 1,
        due: 15,
        effort: 10,
        subtasks: [sub('Pick a perch by the door', { doneDaysAgo: 2 }), sub('Practise with blank envelopes'), sub('First real delivery')],
        extra: { relatedPeople: 'The postmistress, who is not keen on ravens' },
      }),
      task('Trim the griffin’s claws', { touched: 3, due: 1, priority: 'high' }),
      task('Feeding schedule for the toads', { doneDaysAgo: 2 }),
      task('Find the runaway owl', { doneDaysAgo: 50, due: -49, effort: 30 }),
    ],
    { description: 'Who lives in the tower, and what they eat.' },
  );

  const grimoire = project(
    'Grimoire Restoration',
    [
      task('Rebind volume III', {
        touched: 1,
        due: 9,
        effort: 20,
        resources: [res('Coptic binding guide', 'guides/coptic-binding')],
      }),
      task('Translate the marginalia', { touched: 8, due: 8, priority: 'urgent', effort: 10 }),
      task('Index the sealed chapter', {
        touched: 2,
        due: 25,
        effort: 10,
        extra: { startsOn: inDays(5) },
        subtasks: [sub('Break the wax seal, carefully'), sub('Copy the sigils'), sub('Return it to the vault')],
      }),
      task('Mend the torn frontispiece', { touched: 6, due: 11, priority: 'low' }),
      task('Dust the reading room', { doneDaysAgo: 1 }),
      task('Catalogue the new acquisitions', { doneDaysAgo: 31, due: -30, effort: 45 }),
    ],
    { description: 'Rebinding the old spellbooks from the east library.', due: 30 },
  );

  const festival = project(
    'Lantern Festival',
    [
      task('Order the paper lanterns', {
        touched: 0,
        due: 4,
        priority: 'high',
        subtasks: [
          sub('Count last year’s lanterns', { doneDaysAgo: 3 }),
          sub('Pick the colours', { doneDaysAgo: 1 }),
          sub('Send the order to the paper mill', { due: 2 }),
        ],
      }),
      task('Recruit lamplighters', {
        touched: 2,
        due: 10,
        working: true,
        extra: { relatedPeople: 'Mira from the guild; the twins on Hollow Lane', definitionOfDone: 'Twelve names, two per street.' },
      }),
      task('Write the opening charm', { touched: 4, due: 17, priority: 'medium', effort: 15, notes: 'Short. People will be cold.' }),
      task('Test the flame-safe glass', {
        touched: 5,
        due: 7,
        extra: { waiting: { since: ago(5), on: 'The glazier, away until the full moon' } },
      }),
      task('Map the lantern route', { doneDaysAgo: 2 }),
      task('Book the fiddlers', { doneDaysAgo: 38, due: -36, effort: 35 }),
    ],
    { description: 'Lighting the old town for the first frost.', due: 18 },
  );

  const ledger = project(
    'Spell Ledger',
    [
      task('Reconcile the potion accounts', { touched: 12 }),
      task('Price the winter remedies', { touched: 3, due: 13, working: true }),
      task('File the guild dues', {
        touched: 1,
        due: 21,
        priority: 'urgent',
        effort: 10,
        extra: { escalation: { since: ago(1), by: 'Guild treasurer', why: 'Late dues go straight to the council.' } },
      }),
      task('Prepare the solstice offering', { touched: 2, due: 40, effort: 20 }),
      task('Close the autumn books', { doneDaysAgo: 5 }),
      task('Audit the summer accounts', { doneDaysAgo: 45, due: -44, effort: 60 }),
    ],
    { description: 'Coins, debts and favours owed.' },
  );

  const garden = project(
    'Crystal Garden',
    [
      task('Plant the quartz seedlings', { doneDaysAgo: 12 }),
      task('Build the moonlight trellis', { doneDaysAgo: 9 }),
      task('Water the moon ferns', { doneDaysAgo: 72, due: -70, effort: 25 }),
    ],
    { description: 'Grown, tended, glowing.', doneDaysAgo: 8 },
  );

  const wands = project(
    'Wand Inventory',
    [
      task('Count the yew wands', { doneDaysAgo: 60, due: -61, effort: 45 }),
      task('Restring the willow wands', { doneDaysAgo: 58, due: -57, effort: 40 }),
    ],
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
    projects: [observatory, workshop, familiars, festival, grimoire, ledger, garden, wands],
    backlog: [
      idea('Learn to read tea leaves', { notes: 'Start with the chipped blue cup.', daysAgo: 9 }),
      idea('Enchanted irrigation for the herb garden', { suggested: workshop, daysAgo: 5 }),
      idea('Host a starlight market on the solstice', { daysAgo: 2 }),
      idea('Repair the flying broom', { notes: 'The bristles keep steering left.', suggested: familiars, daysAgo: 1 }),
      idea('A second telescope for the south tower', { suggested: observatory, daysAgo: 12 }),
      idea('Lantern-making workshop for children', { suggested: festival, daysAgo: 4 }),
      idea('Swap recipes with the coastal coven', { notes: 'They owe us one for the kelp tonic.', daysAgo: 6 }),
      idea('Teach the owl to sort mail', { daysAgo: 0 }),
    ],
  };
}

// ─── Sample teammates ────────────────────────────────────────────────────────

/** A teammate's tracker, as their exported file would hold it. */
function teammateRoot(now: Date, owner: { id: string; name: string }, allocation: AllocationSettings, projects: Project[]): Root {
  return {
    schemaVersion: SCHEMA_VERSION,
    updatedAt: now.toISOString(),
    owner,
    settings: { allocation },
    projects,
    backlog: [],
  };
}

/**
 * Four teammates: one with a fresh file and a flag raised, one past their
 * limit with an old file, one comfortably light, and one who hasn't sent a
 * file yet.
 */
export function sampleTeam(now: Date): Member[] {
  const member = (key: string, name: string, role: string, file: { daysAgo: number; root: (m: ReturnType<typeof makers>) => Root } | null): Member => {
    const m = makers(now, `${key}-`);
    const exportedAt = m.ago(file?.daysAgo ?? 0);
    return {
      id: `${SAMPLE_PREFIX}member-${key}`,
      name,
      role,
      addedAt: m.ago(20),
      ...(file
        ? {
            ownerId: `${SAMPLE_PREFIX}owner-${key}`,
            snapshot: { root: file.root(m), exportedAt, importedAt: m.ago(file.daysAgo), fileName: `magica-tracker-${localDateStamp(new Date(exportedAt))}.json` },
          }
        : {}),
    };
  };

  return [
    member('alice', 'Alice', 'Optics', {
      daysAgo: 1,
      root: ({ task, project, sub, ago }) =>
        teammateRoot(now, { id: `${SAMPLE_PREFIX}owner-alice`, name: 'Alice' }, { period: 'week', maxLoad: 120 }, [
          project(
            'Moonwell lenses',
            [
              task('Grind the replacement lens', {
                touched: 0,
                due: 3,
                priority: 'high',
                effort: 45,
                extra: { escalation: { since: ago(1), by: 'Archive team', why: 'Their star survey waits on the lens.' } },
              }),
              task('Log the night sky readings', {
                touched: 1,
                effort: 25,
                subtasks: [sub('First night', { doneDaysAgo: 2 }), sub('Second night'), sub('Third night')],
              }),
              task('Test the lens against Polaris', { touched: 2, due: 9, effort: 30, working: true }),
              task('Order the brass fittings', { doneDaysAgo: 4 }),
              // Earlier weeks, for the Observatory's history: one a week, each on time.
              ...[90, 100, 70, 95].map((effort, i) =>
                task(['Polish the old lens', 'Survey the meteor shower', 'Mend the tripod', 'Chart the autumn sky'][i]!, {
                  doneDaysAgo: 9 + 7 * i,
                  due: -(9 + 7 * i),
                  effort,
                }),
              ),
            ],
            { description: 'The new lens for the north tower.', due: 12 },
          ),
          project('Lens library', [task('Catalogue the old lenses', { touched: 6, due: 16 }), task('Clean the archive drawers', { doneDaysAgo: 9 })]),
        ]),
    }),
    member('bram', 'Bram', 'Potions', {
      daysAgo: 10,
      root: ({ task, project, ago }) =>
        teammateRoot(now, { id: `${SAMPLE_PREFIX}owner-bram`, name: 'Bram' }, { period: 'fortnight', maxLoad: 150 }, [
          project(
            'Potion stores',
            [
              task('Brew the fever tonic', { touched: 10, due: -2, priority: 'urgent', effort: 70 }),
              task('Restock moonpetal', {
                touched: 10,
                effort: 60,
                extra: { waiting: { since: ago(12), on: 'The supplier, closed for the harvest' } },
              }),
              task('Label the shelves', { touched: 11, effort: 30 }),
              task('Clean the copper stills', { doneDaysAgo: 13 }),
              // Earlier fortnights past his limit: two big batches in each, on time.
              ...[20, 34, 48, 62].flatMap((days) =>
                ['Brew the cold remedy', 'Bottle the sleeping draught'].map((title) => task(title, { doneDaysAgo: days, due: -days, effort: 85 })),
              ),
            ],
            { description: 'Everything the apothecary sells.' },
          ),
        ]),
    }),
    member('dara', 'Dara', 'Archive', {
      daysAgo: 3,
      root: ({ task, project, sub }) =>
        teammateRoot(now, { id: `${SAMPLE_PREFIX}owner-dara`, name: 'Dara' }, { period: 'fortnight', maxLoad: 140 }, [
          project(
            'Star survey',
            [
              task('Index the survey plates', {
                touched: 1,
                due: 8,
                effort: 30,
                subtasks: [sub('Plates 1–40', { doneDaysAgo: 2 }), sub('Plates 41–80')],
              }),
              task('Sort the plate boxes', { touched: 2, effort: 25 }),
              task('Cross-check with the old charts', { touched: 3, due: 24, effort: 20 }),
              task('Write the survey summary', { touched: 4, due: 30 }),
              ...[60, 80, 45].map((effort, i) =>
                task(['Photograph the north plates', 'Clean the plate glass', 'Label the plate boxes'][i]!, {
                  doneDaysAgo: 18 + 14 * i,
                  due: -(18 + 14 * i),
                  effort,
                }),
              ),
            ],
            { description: 'The archive’s count of every star above the town.', due: 30 },
          ),
        ]),
    }),
    member('chiyo', 'Chiyo', 'Familiars', null),
  ];
}

const isSampleMember = (m: Member) => isSampleId(m.id);

export function hasSampleTeam(team: Team): boolean {
  return team.members.some(isSampleMember);
}

/** Add the sample teammates after your own. Loading twice replaces them. */
export function addSampleTeam(team: Team, now: Date): Team {
  const own = removeSampleTeam(team).members;
  // A name you already use wins; that sample teammate stays out.
  const taken = new Set(own.map((m) => m.name.toLocaleLowerCase()));
  return { ...team, members: [...own, ...sampleTeam(now).filter((m) => !taken.has(m.name.toLocaleLowerCase()))] };
}

export function removeSampleTeam(team: Team): Team {
  return team.members.some(isSampleMember) ? { ...team, members: team.members.filter((m) => !isSampleMember(m)) } : team;
}
