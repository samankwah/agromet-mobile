import {
  activeFilterCount,
  archiveFacets,
  EMPTY_ARCHIVE_FILTERS,
  groupByYear,
  matchedActivities,
  matchesArchiveFilters,
  narrowArchiveFilters,
  UNSET,
} from '../../features/advisories/archive/archiveFilters';
import type { ArchivedAdvisory } from '../../shared/domain/weeklyAdvisory';

function advisory(over: Partial<ArchivedAdvisory> = {}): ArchivedAdvisory {
  return {
    id: 1,
    kind: 'crop',
    title: 'Rice advisory',
    description: 'Season-long guidance.',
    region: 'Eastern Region',
    district: 'Abuakwa North',
    subject: 'Rice',
    year: 2026,
    createdAt: '2026-01-26T06:00:00.000Z',
    activityCount: 2,
    activities: ['Land preparation', 'Top dressing'],
    weekLabels: ['Weeks 1-4'],
    ...over,
  };
}

describe('matchesArchiveFilters', () => {
  it('keeps everything when nothing is narrowed', () => {
    expect(matchesArchiveFilters(advisory(), EMPTY_ARCHIVE_FILTERS)).toBe(true);
  });

  it('filters on kind, place, subject and year', () => {
    const entry = advisory();
    const cases: [Partial<typeof EMPTY_ARCHIVE_FILTERS>, boolean][] = [
      [{ kind: 'crop' }, true],
      [{ kind: 'poultry' }, false],
      [{ region: 'Eastern Region' }, true],
      [{ region: 'Ashanti Region' }, false],
      [{ district: 'Abuakwa North' }, true],
      [{ district: 'Ejisu' }, false],
      [{ subject: 'Rice' }, true],
      [{ subject: 'Maize' }, false],
      [{ year: '2026' }, true],
      [{ year: '2025' }, false],
    ];
    cases.forEach(([change, expected]) => {
      expect(matchesArchiveFilters(entry, { ...EMPTY_ARCHIVE_FILTERS, ...change })).toBe(expected);
    });
  });

  it('treats a missing year as matching no year filter, without crashing', () => {
    const undated = advisory({ year: null });
    expect(matchesArchiveFilters(undated, { ...EMPTY_ARCHIVE_FILTERS, year: '2026' })).toBe(false);
    expect(matchesArchiveFilters(undated, EMPTY_ARCHIVE_FILTERS)).toBe(true);
  });

  describe('search', () => {
    const search = (query: string, entry = advisory()) =>
      matchesArchiveFilters(entry, { ...EMPTY_ARCHIVE_FILTERS, query });

    it('matches the title, the description and the subject', () => {
      expect(search('rice')).toBe(true);
      expect(search('season-long')).toBe(true);
      expect(search('Rice')).toBe(true);
    });

    /* The words an officer actually remembers a bulletin by. They are in the
       list payload already, so searching them costs nothing. */
    it('matches an activity name', () => {
      expect(search('top dressing')).toBe(true);
      expect(search('armyworm')).toBe(false);
    });

    it('ignores case and surrounding space', () => {
      expect(search('  TOP DRESSING  ')).toBe(true);
    });

    it('an all-space query narrows nothing', () => {
      expect(search('   ')).toBe(true);
    });
  });
});

describe('archiveFacets', () => {
  const entries = [
    advisory({ id: 1, region: 'Eastern Region', district: 'Abuakwa North', subject: 'Rice', year: 2026 }),
    advisory({ id: 2, region: 'Eastern Region', district: 'Suhum', subject: 'Maize', year: 2025 }),
    advisory({ id: 3, region: 'Ashanti Region', district: 'Ejisu', subject: 'Maize', year: 2026 }),
    advisory({ id: 4, kind: 'poultry', region: 'Ashanti Region', district: 'Ejisu', subject: 'Broiler', year: 2026 }),
  ];

  /* Not the 16 regions and 261 districts CalendarFilters offers: here the
     reader is choosing among records that exist, and a district with nothing
     published is a dead end. */
  it('offers only places that have advisories', () => {
    const facets = archiveFacets(entries, EMPTY_ARCHIVE_FILTERS);
    expect(facets.regions).toEqual(['Ashanti Region', 'Eastern Region']);
    expect(facets.districts).toEqual(['Abuakwa North', 'Ejisu', 'Suhum']);
  });

  it('narrows districts to the chosen region', () => {
    const facets = archiveFacets(entries, { ...EMPTY_ARCHIVE_FILTERS, region: 'Eastern Region' });
    expect(facets.districts).toEqual(['Abuakwa North', 'Suhum']);
    expect(facets.subjects).toEqual(['Maize', 'Rice']);
  });

  it('narrows subjects to the chosen district', () => {
    const facets = archiveFacets(entries, {
      ...EMPTY_ARCHIVE_FILTERS,
      region: 'Eastern Region',
      district: 'Suhum',
    });
    expect(facets.subjects).toEqual(['Maize']);
  });

  it('narrows by kind, so a crop filter never offers a bird', () => {
    const facets = archiveFacets(entries, { ...EMPTY_ARCHIVE_FILTERS, kind: 'crop' });
    expect(facets.subjects).not.toContain('Broiler');
  });

  it('lists years newest first', () => {
    expect(archiveFacets(entries, EMPTY_ARCHIVE_FILTERS).years).toEqual(['2026', '2025']);
  });
});

describe('groupByYear', () => {
  it('groups newest year first, and newest first inside a year', () => {
    const groups = groupByYear([
      advisory({ id: 1, year: 2025, createdAt: '2025-06-01T00:00:00.000Z' }),
      advisory({ id: 2, year: 2026, createdAt: '2026-01-01T00:00:00.000Z' }),
      advisory({ id: 3, year: 2026, createdAt: '2026-03-01T00:00:00.000Z' }),
    ]);

    expect(groups.map((group) => group.year)).toEqual(['2026', '2025']);
    expect(groups[0].entries.map((entry) => entry.id)).toEqual([3, 2]);
  });

  /* A missing year is a gap in an upload, not a reason to hide a bulletin. */
  it('keeps undated advisories, grouped last', () => {
    const groups = groupByYear([advisory({ id: 1, year: null }), advisory({ id: 2, year: 2026 })]);
    expect(groups.map((group) => group.year)).toEqual(['2026', 'Undated']);
  });

  it('returns nothing for nothing', () => {
    expect(groupByYear([])).toEqual([]);
  });
});

describe('narrowArchiveFilters', () => {
  const set = { ...EMPTY_ARCHIVE_FILTERS, region: 'Eastern Region', district: 'Suhum', subject: 'Rice' };

  /* A district belongs to exactly one region, so it cannot survive a region
     change — leaving it set produces a combination matching nothing, which
     reads as a bug. */
  it('clears the district and subject when the region changes', () => {
    const next = narrowArchiveFilters(set, { region: 'Ashanti Region' });
    expect(next.district).toBe(UNSET);
    expect(next.subject).toBe(UNSET);
  });

  it('clears the subject when the district changes', () => {
    const next = narrowArchiveFilters(set, { district: 'Abuakwa North' });
    expect(next.district).toBe('Abuakwa North');
    expect(next.subject).toBe(UNSET);
  });

  /* A crop is not a bird. */
  it('clears the subject when the kind changes', () => {
    const next = narrowArchiveFilters(set, { kind: 'poultry' });
    expect(next.subject).toBe(UNSET);
    expect(next.region).toBe('Eastern Region');
  });

  it('leaves everything alone when the value has not actually changed', () => {
    expect(narrowArchiveFilters(set, { region: 'Eastern Region' })).toEqual(set);
  });

  it('does not disturb other filters when only the query changes', () => {
    const next = narrowArchiveFilters(set, { query: 'top dressing' });
    expect(next).toEqual({ ...set, query: 'top dressing' });
  });
});

describe('activeFilterCount', () => {
  it('counts nothing when nothing is narrowed', () => {
    expect(activeFilterCount(EMPTY_ARCHIVE_FILTERS)).toBe(0);
  });

  it('counts each narrowed filter once', () => {
    expect(
      activeFilterCount({
        kind: 'crop',
        region: 'Eastern Region',
        district: 'Suhum',
        subject: 'Rice',
        year: '2026',
        query: 'top',
      }),
    ).toBe(6);
  });

  it('does not count a whitespace-only query', () => {
    expect(activeFilterCount({ ...EMPTY_ARCHIVE_FILTERS, query: '   ' })).toBe(0);
  });
});

describe('matchedActivities', () => {
  const entry = advisory({ activities: ['Land preparation', 'Top dressing', 'Pest watch'] });

  /* Empty while browsing is the point: it keeps a line off every row unless
     the reader is actually searching. */
  it('finds nothing when there is no search', () => {
    expect(matchedActivities(entry, EMPTY_ARCHIVE_FILTERS)).toEqual([]);
  });

  it('returns only the activities that matched, so a row can say why', () => {
    expect(matchedActivities(entry, { ...EMPTY_ARCHIVE_FILTERS, query: 'watch' })).toEqual(['Pest watch']);
  });

  it('can return several', () => {
    expect(matchedActivities(entry, { ...EMPTY_ARCHIVE_FILTERS, query: 'p' })).toEqual([
      'Land preparation',
      'Top dressing',
      'Pest watch',
    ]);
  });

  /* A title-only match leaves this empty, and the row simply shows no evidence
     line rather than an empty heading. */
  it('is empty when the match came from the title instead', () => {
    expect(matchedActivities(entry, { ...EMPTY_ARCHIVE_FILTERS, query: 'rice' })).toEqual([]);
  });
});
