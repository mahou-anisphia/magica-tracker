import type { LoadItem } from './progress';
import type { Domain, Project, Root } from './schema';

/** Some projects under one domain, or (domain null) under none. */
export type DomainGroup<T> = { domain: Domain | null; items: T[] };

/** A project's domain, if it has one that still exists. */
export function domainOf(root: Root, project: Project): Domain | undefined {
  return project.domainId ? root.domains?.find((d) => d.id === project.domainId) : undefined;
}

/**
 * Things that belong to projects, grouped by their project's domain: the
 * domains in their own order, then everything in no domain. Each group keeps
 * the order it was given. With `keepEmpty`, a domain with nothing in it still
 * gets its (empty) group; the no-domain group shows only when it has
 * something. Without any domains, it is one group, domain null.
 */
export function byDomain<T>(root: Root, items: T[], projectOf: (item: T) => Project, keepEmpty = false): DomainGroup<T>[] {
  const domains = root.domains ?? [];
  if (!domains.length) return [{ domain: null, items }];
  const groups = domains.map((domain): DomainGroup<T> => ({ domain, items: [] }));
  const none: DomainGroup<T> = { domain: null, items: [] };
  const index = new Map(domains.map((d, i) => [d.id, groups[i]!]));
  for (const item of items) {
    const id = projectOf(item).domainId;
    (id ? (index.get(id) ?? none) : none).items.push(item);
  }
  return [...groups.filter((g) => keepEmpty || g.items.length), ...(none.items.length ? [none] : [])];
}

/** Part of a period's load: one domain's tasks, or one project's when it has no domain. */
export type LoadGroup = {
  key: string;
  name: string;
  /** Set for a domain's group; null for a project's own. */
  domain: Domain | null;
  /** How many projects add to it. */
  projects: number;
  share: number;
  items: LoadItem[];
};

/**
 * What filled a period, grouped: by domain, and a project with no domain on
 * its own. Largest share first; each group's tasks keep their order.
 */
export function loadGroups(root: Root, items: LoadItem[]): LoadGroup[] {
  const groups = new Map<string, LoadGroup & { ids: Set<string> }>();
  for (const item of items) {
    const domain = domainOf(root, item.project) ?? null;
    const key = domain ? `domain:${domain.id}` : `project:${item.project.id}`;
    let g = groups.get(key);
    if (!g) {
      g = { key, name: domain?.name ?? item.project.name, domain, projects: 0, share: 0, items: [], ids: new Set() };
      groups.set(key, g);
    }
    g.ids.add(item.project.id);
    g.projects = g.ids.size;
    g.share += item.share;
    g.items.push(item);
  }
  return [...groups.values()].map(({ ids: _, ...g }) => g).sort((a, b) => b.share - a.share);
}
