import React, { useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import type { ArchivedAdvisory } from '../../../shared/domain/weeklyAdvisory';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { AsyncStateView } from '../../../shared/ui/AsyncStateView';
import { Card } from '../../../shared/ui/Card';
import { Screen } from '../../../shared/ui/Screen';
import { Text } from '../../../shared/ui/Text';
import { formatRelativeTime } from '../../../shared/utils/formatRelativeTime';
import { ArchiveFilters } from './components/ArchiveFilters';
import { ArchiveRow } from './components/ArchiveRow';
import { SearchField } from '../../../shared/ui/SearchField';
import { ArchiveSkeleton } from './components/ArchiveSkeletons';
import {
  activeFilterCount,
  type ArchiveFilterState,
  EMPTY_ARCHIVE_FILTERS,
  groupByYear,
  matchedActivities,
  matchesArchiveFilters,
  narrowArchiveFilters,
  UNSET,
} from './archiveFilters';
import { useAdvisoryArchive } from './useAdvisoryArchive';

type YearGroup = ReturnType<typeof groupByYear>[number];

/**
 * One year's card, unchanged from before this screen was virtualized —
 * still one chamfered Card wrapping every row for the year, divided by
 * hairlines. Rendered as a single FlatList item rather than inlined, so a
 * year that has scrolled off screen can be unmounted instead of staying
 * resident.
 */
function YearGroupCard({
  group,
  filter,
  onOpen,
}: {
  group: YearGroup;
  filter: ArchiveFilterState;
  onOpen: (entry: ArchivedAdvisory) => void;
}) {
  const theme = useTheme();

  return (
    <View style={{ gap: theme.spacing.sm }}>
      <YearMarker year={group.year} count={group.entries.length} />

      {/* One card per year, rows divided by hairlines. Seven floating cards
          read as seven unrelated things; rows under one edge read as a
          list. */}
      <Card style={{ paddingHorizontal: 0, paddingVertical: 0, overflow: 'hidden' }}>
        {group.entries.map((entry, index) => (
          <ArchiveRow
            key={entry.id}
            entry={entry}
            first={index === 0}
            matched={matchedActivities(entry, filter)}
            showRegion={filter.region === UNSET}
            onOpen={onOpen}
          />
        ))}
      </Card>
    </View>
  );
}

/**
 * A year marker: the label, a rule running to the count.
 *
 * The rule is what makes the list read as an archive rather than a feed. A bare
 * heading between groups leaves the eye to infer the break; a line draws it.
 */
function YearMarker({ year, count }: { year: string; count: number }) {
  const theme = useTheme();

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
      <Text variant="h3">{year}</Text>
      <View
        style={{
          flex: 1,
          height: StyleSheet.hairlineWidth,
          backgroundColor: theme.colors.border,
        }}
      />
      <Text variant="caption" muted>
        {count}
      </Text>
    </View>
  );
}

/**
 * Everything the office has published, searchable.
 *
 * This exists because the weekly advisory screen shows only the newest bulletin
 * for a place — `fetchSnapshot` fetches the whole matching history and then
 * takes `list.data[0]`. The rest is what an extension officer wants when they
 * ask what went out for a district in March, and until now there was no way to
 * reach it.
 *
 * The layout is content-first, in this order and for these reasons: search,
 * because it is the fastest way into a known record; the kind switch, because
 * it is one tap and used constantly; then the records. The place and time
 * pickers fold away, since four dropdowns would fill a phone screen before a
 * single advisory appeared.
 *
 * Records are grouped by year because `year` is the only trustworthy time
 * column on an advisory — `createdAt` is when the spreadsheet was uploaded.
 */
export function AdvisoryArchiveScreen() {
  const theme = useTheme();
  const [filter, setFilter] = useState<ArchiveFilterState>(EMPTY_ARCHIVE_FILTERS);

  const archive = useAdvisoryArchive();
  const { entries, fallback } = archive;

  const visible = useMemo(
    () => entries.filter((entry) => matchesArchiveFilters(entry, filter)),
    [entries, filter],
  );
  const groups = useMemo(() => groupByYear(visible), [visible]);
  const active = activeFilterCount(filter);

  // Where the results came from, said once, next to the count — rather than
  // repeating "Eastern Region" beside every row that shares it.
  const scope = [
    filter.district !== UNSET ? filter.district : null,
    filter.district === UNSET && filter.region !== UNSET ? filter.region : null,
    filter.subject !== UNSET ? filter.subject : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const openAdvisory = (entry: ArchivedAdvisory) =>
    // Object form, and the id as a string: route params are strings, and
    // ArchivedAdvisory.id is a number.
    router.push({
      pathname: '/advisory/[kind]',
      params: { kind: entry.kind, advisoryId: String(entry.id) },
    });

  const update = (change: Partial<ArchiveFilterState>) =>
    setFilter((current) => narrowArchiveFilters(current, change));

  // Not scrolling: the results render through a FlatList below (virtualized
  // so a growing archive never mounts every year at once), and a FlatList
  // inside a ScrollView both warns and defeats its own windowing. Search and
  // the filter controls sit as fixed siblings above it instead of scrolling
  // away with the results — matching ArchiveSkeleton's own assumption that
  // the search field stays on screen throughout the load.
  return (
    <Screen scroll={false}>
      <View style={{ flex: 1, gap: theme.spacing.lg }}>
        <SearchField
          value={filter.query}
          onChange={(query) => update({ query })}
          placeholder="Search titles and activities"
          accessibilityLabel="Search advisories"
        />

        <ArchiveFilters
          entries={entries}
          value={filter}
          onChange={update}
          onClear={() => setFilter(EMPTY_ARCHIVE_FILTERS)}
        />

        <AsyncStateView
          status={archive.status}
          error={archive.error}
          onRetry={archive.refetch}
          skeleton={<ArchiveSkeleton />}
        >
          <View style={{ flex: 1, gap: theme.spacing.lg }}>
            {/* A lost connection is worth saying: it is the one the farmer can
                fix. A saved copy says how old it is. */}
            {fallback === 'offline' ? (
              <Card style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                <Text variant="body" muted style={{ flex: 1 }}>
                  Could not reach the AgroMet server. Check your connection.
                </Text>
              </Card>
            ) : archive.usingCachedFallback ? (
              <Text variant="caption" muted>
                Showing advisories saved{' '}
                {archive.cachedAt ? formatRelativeTime(archive.cachedAt) : 'earlier'}
              </Text>
            ) : null}

            {visible.length === 0 ? (
              <Card style={{ gap: theme.spacing.xs }}>
                <Text variant="bodyStrong">
                  {active > 0 ? 'No advisories match' : 'Nothing in the archive'}
                </Text>
                <Text variant="body" muted>
                  {active > 0
                    ? 'Try a different activity, or clear a filter.'
                    : 'Published advisories will appear here.'}
                </Text>
              </Card>
            ) : (
              <FlatList
                style={{ flex: 1 }}
                data={groups}
                keyExtractor={(group) => group.year}
                renderItem={({ item }) => <YearGroupCard group={item} filter={filter} onOpen={openAdvisory} />}
                contentContainerStyle={{ gap: theme.spacing.lg }}
                ListHeaderComponent={
                  <Text variant="caption" muted>
                    {visible.length} {visible.length === 1 ? 'advisory' : 'advisories'}
                    {visible.length !== entries.length ? ` of ${entries.length}` : ''}
                    {scope ? ` · ${scope}` : ''}
                  </Text>
                }
                ListHeaderComponentStyle={{ marginBottom: theme.spacing.sm }}
              />
            )}
          </View>
        </AsyncStateView>
      </View>
    </Screen>
  );
}
