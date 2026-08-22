import { useMemo } from 'react';

import { useCachedQuery } from '../../../shared/api/useCachedQuery';
import {
  getWeeklyAdvisory,
  listAdvisoryActivities,
  seededAdvisory,
  type AdvisoryFallback,
} from '../../../shared/api/weeklyAdvisoryService';
import {
  type AdvisoryFilterState,
  type AdvisoryKind,
  type WeeklyAdvisory,
} from '../../../shared/domain/weeklyAdvisory';

const HOUR = 60 * 60 * 1000;

type Snapshot = { advisory: WeeklyAdvisory; fallback: AdvisoryFallback };

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
async function fetchSnapshot(
  kind: AdvisoryKind,
  filter: AdvisoryFilterState,
  advisoryId?: number,
): Promise<Snapshot> {
  // Opened from the archive: the record is already chosen, so skip the lookup
  // entirely. Without this the screen would search by filter and land on the
  // newest bulletin for the district rather than the one that was tapped.
  if (advisoryId !== undefined) {
    const chosen = await getWeeklyAdvisory(advisoryId, kind);
    return { advisory: chosen.data, fallback: chosen.fallback };
  }

  // An unset field is not sent, so an empty filter asks the server for
  // everything it has published anywhere — the national view the screen opens
  // on, before the farmer has narrowed it to their own district.
  const list = await listAdvisoryActivities(filter);

  // Nothing to fetch: either the server is unreachable or it has published
  // nothing here. Both fall back to the seeded bulletin, and the caller is told
  // which, because "no signal" and "not written yet" need different words.
  if (list.fallback !== null) {
    return { advisory: seededAdvisory(kind), fallback: list.fallback };
  }

  const detail = await getWeeklyAdvisory(list.data[0].advisoryId, kind);
  return { advisory: detail.data, fallback: detail.fallback };
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
    queryFn: () => fetchSnapshot(kind, filter, advisoryId),
    cacheKey: `weekly-advisory:${key}`,
    staleTime: 6 * HOUR,
    gcTime: 7 * 24 * HOUR,
  });

  const advisory = query.data?.advisory ?? null;

  // A bulletin can hold several activities; a poultry one holds none.
  const activities = useMemo(() => advisory?.activities ?? [], [advisory]);

  return {
    ...query,
    advisory,
    activities,
    fallback: query.data?.fallback ?? null,
  };
}
