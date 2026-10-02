import { useMemo } from 'react';

import { useCachedQuery } from '../../../shared/api/useCachedQuery';
import { NetworkError } from '../../../shared/api/http';
import { getWeeklyAdvisory, listAdvisoryActivities, type AdvisoryFallback } from '../../../shared/api/weeklyAdvisoryService';
import { type AdvisoryFilterState, type AdvisoryKind, type WeeklyAdvisory } from '../../../shared/domain/weeklyAdvisory';

const HOUR = 60 * 60 * 1000;

type Snapshot = { advisory: WeeklyAdvisory | null; fallback: AdvisoryFallback };

/** The words the screen shows when the server cannot be reached and nothing
 * is saved on the phone. */
const OFFLINE_MESSAGE = 'Could not reach the AgroMet server. Check your connection.';

/**
 * "Offline" is raised as an error rather than returned as a snapshot. That is
 * what lets `useCachedQuery` put the last real bulletin saved on this phone on
 * screen; a snapshot would succeed, overwrite that saved copy with nothing, and
 * leave the farmer with less than they had.
 */
function settle(snapshot: Snapshot): Snapshot {
  if (snapshot.fallback === 'offline') throw new NetworkError(OFFLINE_MESSAGE);
  return snapshot;
}

/**
 * Find the bulletin for a district and fetch it whole.
 *
 * Two calls chained inside one query rather than two dependent queries: the
 * screen has one thing to show and should therefore have one loading state, not
 * a spinner that resolves into a second spinner.
 *
 * The whole bulletin is fetched once and its activities switched locally. The
 * detail endpoint does accept an `?activity=` parameter, and the web app calls
 * it again on every sidebar click, but the first response already carries every
 * activity — so paying for a round trip per tap would buy nothing, and would
 * stop working the moment the signal did.
 */
async function fetchSnapshot(filter: AdvisoryFilterState, advisoryId?: number): Promise<Snapshot> {
  // Opened from the archive: the record is already chosen, so skip the lookup
  // entirely. Without this the screen would search by filter and land on the
  // newest bulletin for the district rather than the one that was tapped.
  if (advisoryId !== undefined) {
    const chosen = await getWeeklyAdvisory(advisoryId);
    return settle({ advisory: chosen.data, fallback: chosen.fallback });
  }

  // An unset field is not sent, so an empty filter asks the server for
  // everything it has published anywhere — the national view the screen opens
  // on, before the farmer has narrowed it to their own district.
  const list = await listAdvisoryActivities(filter);

  // Nothing to fetch: either the server is unreachable or it has published
  // nothing here. Neither puts a bulletin on screen. No invented stand-in is
  // shown, because a farmer could act on it believing it was written for them.
  if (list.fallback !== null) {
    return settle({ advisory: null, fallback: list.fallback });
  }

  const detail = await getWeeklyAdvisory(list.data[0].advisoryId);
  return settle({ advisory: detail.data, fallback: detail.fallback });
}

/** A stable, order-independent cache key, per useCalendars' convention.
 *
 * `zone` is absent because it never reaches the server. `advisoryId` is present
 * because an explicit record and a filter search are different requests, and
 * sharing a key would serve one under the other's name. */
function filterKey(kind: AdvisoryKind, filter: AdvisoryFilterState, advisoryId?: number): string {
  const scope = advisoryId === undefined ? '' : `#${advisoryId}`;
  return [kind, filter.region, filter.district, filter.subject].join('|') + scope;
}

/**
 * @param advisoryId When given, that exact advisory is fetched and the filters
 *   are ignored — the archive has already chosen the record. Omitted everywhere
 *   else, so the filter-driven behaviour is unchanged.
 */
export function useWeeklyAdvisory(kind: AdvisoryKind, filter: AdvisoryFilterState, advisoryId?: number) {
  const key = filterKey(kind, filter, advisoryId);

  const query = useCachedQuery<Snapshot>({
    queryKey: ['weekly-advisory', key],
    queryFn: () => fetchSnapshot(filter, advisoryId),
    cacheKey: `weekly-advisory:${key}`,
    staleTime: 6 * HOUR,
    gcTime: 7 * 24 * HOUR,
  });

  // A snapshot saved by an older build may still hold the seeded stand-in it
  // used to fall back to; anything flagged as a fallback is never shown.
  const advisory = query.data && query.data.fallback === null ? query.data.advisory : null;

  // A bulletin can hold several activities; a poultry one holds none.
  const activities = useMemo(() => advisory?.activities ?? [], [advisory]);

  return {
    ...query,
    advisory,
    activities,
    fallback: query.data?.fallback ?? null,
  };
}
