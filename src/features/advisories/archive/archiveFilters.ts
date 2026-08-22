import type { ArchivedAdvisory } from '../../../shared/domain/weeklyAdvisory';

/**
 * What the archive is narrowed to, and the pure functions that apply it.
 *
 * Type, predicate and facets live together — the convention CalendarFilters
 * established — so the logic can be unit-tested without rendering a screen.
 */

/** The sentinel for "not narrowed". Matches CalendarFilters' UNSET. */
export const UNSET = '';

export type ArchiveKindFilter = 'all' | 'crop' | 'poultry';

export type ArchiveFilterState = {
  kind: ArchiveKindFilter;
  region: string;
  district: string;
  /** The crop, or the bird for a poultry advisory. */
  subject: string;
  year: string;
  /** Free text over title, description and activity names. */
  query: string;
};

export const EMPTY_ARCHIVE_FILTERS: ArchiveFilterState = {
  kind: 'all',
  region: UNSET,
  district: UNSET,
  subject: UNSET,
  year: UNSET,
  query: '',
};

/**
 * Whether one advisory survives the current filters.
 *
 * Search covers the title, the description and the activity names. The activity
 * names are the most useful of the three — "Top dressing", "Fall armyworm
 * watch" — and they are the words an officer actually remembers a bulletin by.
 * They arrive in the list payload already, so searching them costs nothing.
 */
export function matchesArchiveFilters(entry: ArchivedAdvisory, filter: ArchiveFilterState): boolean {
  if (filter.kind !== 'all' && entry.kind !== filter.kind) return false;
  if (filter.region !== UNSET && entry.region !== filter.region) return false;
  if (filter.district !== UNSET && entry.district !== filter.district) return false;
  if (filter.subject !== UNSET && entry.subject !== filter.subject) return false;
  if (filter.year !== UNSET && String(entry.year ?? '') !== filter.year) return false;

  const term = filter.query.trim().toLowerCase();
  if (term === '') return true;

  return (
    entry.title.toLowerCase().includes(term) ||
    entry.description.toLowerCase().includes(term) ||
    entry.subject.toLowerCase().includes(term) ||
    entry.activities.some((activity) => activity.toLowerCase().includes(term))
  );
}

function unique(values: (string | null | undefined)[]): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value && value.trim())))].sort();
}

/**
 * The options worth offering, derived from what has actually been published.
 *
 * Deliberately not `GHANA_REGION_NAMES` and `districtsInRegion`, which is what
 * CalendarFilters uses. There, a farmer is choosing *their own* district, so
 * every district must be offerable. Here they are choosing among records that
 * exist — and offering 261 districts when four have ever had an advisory
 * published is a menu of dead ends.
 *
 * Each facet is narrowed by the ones above it in the panel, so the options can
 * never produce an empty result: pick a region and the district list holds only
 * that region's districts that actually have advisories.
 */
export function archiveFacets(entries: ArchivedAdvisory[], filter: ArchiveFilterState) {
  const byKind = entries.filter((entry) => filter.kind === 'all' || entry.kind === filter.kind);
  const byRegion = byKind.filter((entry) => filter.region === UNSET || entry.region === filter.region);
  const byDistrict = byRegion.filter(
    (entry) => filter.district === UNSET || entry.district === filter.district,
  );

  return {
    regions: unique(byKind.map((entry) => entry.region)),
    districts: unique(byRegion.map((entry) => entry.district)),
    subjects: unique(byDistrict.map((entry) => entry.subject)),
    // Newest first: an archive is read backwards from now.
    years: unique(byDistrict.map((entry) => (entry.year === null ? null : String(entry.year)))).reverse(),
  };
}

/**
 * Grouped into years, newest first, and newest first within each year.
 *
 * `year` is the only trustworthy time column — `createdAt` records when the
 * spreadsheet was uploaded, not the period the advisory covers — so it is what
 * the grouping uses. Records with no year are grouped last under a plain label
 * rather than dropped, because a missing year is a gap in an upload, not a
 * reason to hide a bulletin.
 */
export function groupByYear(entries: ArchivedAdvisory[]): { year: string; entries: ArchivedAdvisory[] }[] {
  const groups = new Map<string, ArchivedAdvisory[]>();

  entries.forEach((entry) => {
    const key = entry.year === null ? '' : String(entry.year);
    groups.set(key, [...(groups.get(key) ?? []), entry]);
  });

  return [...groups.entries()]
    .sort(([a], [b]) => {
      if (a === '') return 1;
      if (b === '') return -1;
      return b.localeCompare(a);
    })
    .map(([year, group]) => ({
      year: year === '' ? 'Undated' : year,
      entries: [...group].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    }));
}

/**
 * The activity names that match the current search.
 *
 * A row shows these instead of its first few activities, so a search result can
 * say *why* it matched — "Fall armyworm watch" rather than making the reader
 * guess which of nine activities contained the word. Empty while browsing,
 * which is what keeps a line off every row in the common case.
 */
export function matchedActivities(entry: ArchivedAdvisory, filter: ArchiveFilterState): string[] {
  const term = filter.query.trim().toLowerCase();
  if (term === '') return [];
  return entry.activities.filter((activity) => activity.toLowerCase().includes(term));
}

/** How many filters are narrowing the list, for the "clear" affordance. */
export function activeFilterCount(filter: ArchiveFilterState): number {
  let count = 0;
  if (filter.kind !== 'all') count += 1;
  if (filter.region !== UNSET) count += 1;
  if (filter.district !== UNSET) count += 1;
  if (filter.subject !== UNSET) count += 1;
  if (filter.year !== UNSET) count += 1;
  if (filter.query.trim() !== '') count += 1;
  return count;
}

/**
 * Applies one change, clearing whatever it invalidates.
 *
 * The cascade matters: a district belongs to exactly one region, so it cannot
 * survive a region change, and a crop is not a bird, so a subject cannot
 * survive a change of kind. Leaving them set would produce a filter
 * combination that matches nothing and looks like a bug.
 */
export function narrowArchiveFilters(
  filter: ArchiveFilterState,
  change: Partial<ArchiveFilterState>,
): ArchiveFilterState {
  const next = { ...filter, ...change };

  if (change.kind !== undefined && change.kind !== filter.kind) {
    next.subject = UNSET;
  }
  if (change.region !== undefined && change.region !== filter.region) {
    next.district = UNSET;
    next.subject = UNSET;
  }
  if (change.district !== undefined && change.district !== filter.district) {
    next.subject = UNSET;
  }

  return next;
}
