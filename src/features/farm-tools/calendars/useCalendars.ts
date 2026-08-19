import { useMemo } from 'react';

import { getCalendarDetail, getCalendarMetadata, listCalendars, type CalendarFilter } from '../../../shared/api/calendarService';
import { useCachedQuery } from '../../../shared/api/useCachedQuery';
import type { CalendarKind } from '../../../shared/domain/calendar';

/** Calendars change seasonally at best, so refetching on every visit costs
 * a farmer's data for nothing. A day stale, a week retained. */
const DAY = 24 * 60 * 60 * 1000;
const CALENDAR_STALE_TIME = DAY;
const CALENDAR_GC_TIME = 7 * DAY;

/** A stable, order-independent key. The query key and the cache key must
 * agree, or changing a filter reads back the previous filter's payload. */
function filterKey(filter: CalendarFilter): string {
  const parts = Object.entries(filter)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${key}=${String(value)}`)
    .sort();
  return parts.join('&');
}

export function useCalendarList(filter: CalendarFilter) {
  const key = useMemo(() => filterKey(filter), [filter]);

  const query = useCachedQuery({
    queryKey: ['calendars', key],
    queryFn: () => listCalendars(filter),
    cacheKey: `calendars:list:${key}`,
    staleTime: CALENDAR_STALE_TIME,
    gcTime: CALENDAR_GC_TIME,
  });

  return {
    ...query,
    calendars: query.data?.data ?? [],
    samples: query.data?.samples ?? [],
    fallback: query.data?.fallback ?? null,
  };
}

/** One request — the detail endpoint embeds its activities. */
export function useCalendarDetail(id: string | undefined) {
  const query = useCachedQuery({
    queryKey: ['calendar', id],
    queryFn: () => getCalendarDetail(id!),
    cacheKey: `calendars:detail:${id}`,
    enabled: Boolean(id),
    staleTime: CALENDAR_STALE_TIME,
    gcTime: CALENDAR_GC_TIME,
  });

  return {
    ...query,
    calendar: query.data?.data.calendar,
    activities: query.data?.data.activities ?? [],
    fallback: query.data?.fallback ?? null,
  };
}

/**
 * The filter options, taken from the server rather than built locally.
 *
 * This matters more than it looks: the backend filters on exact string
 * equality, and it stores region as "Ashanti Region" while the app's own
 * district catalogue says "Ashanti". A locally-built dropdown would offer
 * options that match nothing. `/metadata` derives its lists from the rows
 * that exist, so every option is guaranteed to return something.
 */
export function useCalendarMetadata(kind: CalendarKind) {
  const query = useCachedQuery({
    queryKey: ['calendar-metadata'],
    queryFn: () => getCalendarMetadata(),
    cacheKey: 'calendars:metadata',
    staleTime: CALENDAR_STALE_TIME,
    gcTime: CALENDAR_GC_TIME,
  });

  return {
    ...query,
    metadata: query.data?.data,
    // Poultry types are stored in the same `crop` column as crops, so the
    // commodity list mixes both. Split it by what the calendars of this
    // kind actually use, which the caller narrows further.
    kind,
  };
}
