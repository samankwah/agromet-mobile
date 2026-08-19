import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import type { Calendar, CalendarKind } from '../../../shared/domain/calendar';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { AsyncStateView } from '../../../shared/ui/AsyncStateView';
import { Card } from '../../../shared/ui/Card';
import { MockDataTag } from '../../../shared/ui/MockDataTag';
import { Screen } from '../../../shared/ui/Screen';
import { Text } from '../../../shared/ui/Text';
import { formatRelativeTime } from '../../../shared/utils/formatRelativeTime';
import { CalendarFilters, EMPTY_FILTERS, isComplete, matchesFilters, type FilterState } from './components/CalendarFilters';
import { SampleDataNotice } from './components/SampleDataNotice';
import { useCalendarList } from './useCalendars';

const COPY: Record<CalendarKind, { title: string; subject: string; empty: string }> = {
  crop: {
    title: 'Crop Calendars',
    subject: 'Crop',
    empty: 'No crop calendars have been published for these filters yet.',
  },
  poultry: {
    title: 'Poultry Calendars',
    subject: 'Bird',
    empty: 'No poultry calendars have been published for these filters yet.',
  },
};

type Props = { kind: CalendarKind };

/**
 * Browse the published calendars for one kind.
 *
 * Everything for a kind is fetched in a single request and filtered in
 * memory. There are a handful of calendars, so a round trip per dropdown
 * change would buy nothing but a spinner — and filtering locally sidesteps
 * the backend's exact-string matching, which is unforgiving about
 * "Ashanti" versus "Ashanti Region".
 */
export function CalendarListScreen({ kind }: Props) {
  const theme = useTheme();
  const copy = COPY[kind];

  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  /** The calendar this screen has already opened for the current filters.
   * Without it, returning from the detail screen would immediately push
   * straight back into it — the filters are still complete, so the
   * condition that opened it is still true, and Back becomes unusable. */
  const [openedId, setOpenedId] = useState<string | null>(null);

  const { status, error, calendars, fallback, usingCachedFallback, cachedAt, refetch } = useCalendarList({ kind });

  const seasonRequired = kind === 'crop' && calendars.some((entry) => entry.seasons.length > 0);
  const ready = isComplete(filters, seasonRequired);
  const visible = useMemo(() => (ready ? calendars.filter((entry) => matchesFilters(entry, filters)) : []), [calendars, filters, ready]);

  // Narrowing to season, crop, region and district usually leaves exactly
  // one calendar, and making the farmer tap a single-item list to reach it
  // is a step that carries no choice. Open it. More than one match still
  // lists them, because then there is a choice to make.
  const onlyMatch = ready && visible.length === 1 ? visible[0] : null;
  const isOpening = onlyMatch !== null && onlyMatch.id !== openedId;

  useEffect(() => {
    if (onlyMatch && onlyMatch.id !== openedId) {
      setOpenedId(onlyMatch.id);
      router.push(`/calendar/${onlyMatch.id}`);
    }
  }, [onlyMatch, openedId]);

  return (
    <Screen>
      <View>
        <Text variant="h1">{copy.title}</Text>
        <Text variant="body" muted>
          Week-by-week activities from land preparation through to harvest and storage.
        </Text>
      </View>

      {usingCachedFallback ? (
        <Text variant="caption" muted>
          Showing the copy saved {formatRelativeTime(cachedAt!)} — the server could not be reached.
        </Text>
      ) : null}

      <AsyncStateView status={status} error={error} onRetry={refetch}>
        <View style={{ gap: theme.spacing.lg }}>
          <CalendarFilters
            kind={kind}
            calendars={calendars}
            value={filters}
            onChange={(next) => {
              setOpenedId(null);
              setFilters(next);
            }}
          />

          {ready && !isOpening ? (
            visible.length === 0 ? (
              <Card>
                <Text variant="body" muted>
                  {copy.empty}
                </Text>
              </Card>
            ) : (
              visible.map((calendar) => <CalendarRow key={calendar.id} calendar={calendar} />)
            )
          ) : null}

          {fallback ? (
            <>
              <SampleDataNotice reason={fallback} />
              <MockDataTag />
            </>
          ) : null}
        </View>
      </AsyncStateView>
    </Screen>
  );
}

function CalendarRow({ calendar }: { calendar: Calendar }) {
  const theme = useTheme();
  const weeks = calendar.totalWeeks;
  const place = [calendar.district, calendar.region].filter(Boolean).join(', ');

  return (
    <Pressable
      onPress={() => router.push(`/calendar/${calendar.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`${calendar.title}. ${weeks} weeks. ${place}. Opens the full calendar.`}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      <Card style={{ gap: theme.spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.md }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="h3">{calendar.title}</Text>
            <Text variant="caption" muted>
              {place}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.muted} />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
          <Ionicons name="time-outline" size={14} color={theme.colors.muted} />
          <Text variant="caption" muted>
            {weeks} week{weeks === 1 ? '' : 's'}
            {calendar.breedType ? ` · ${calendar.breedType}` : ''}
          </Text>
        </View>

        {calendar.sampleActivities.length > 0 ? (
          <Text variant="caption" muted numberOfLines={2}>
            {calendar.sampleActivities.slice(0, 4).join(' · ')}
          </Text>
        ) : null}
      </Card>
    </Pressable>
  );
}
