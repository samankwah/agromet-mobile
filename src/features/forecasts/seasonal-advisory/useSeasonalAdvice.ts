import { useQuery } from '@tanstack/react-query';

import { getSeasonalAdvice } from '../../../shared/api/seasonalAdviceService';
import { getSeasonalOutlookSet } from '../../../shared/api/seasonalService';
import { useCachedQuery } from '../../../shared/api/useCachedQuery';
import type { SeasonKey, WindowKey } from '../../../shared/domain/seasonalOutlook';

const HOUR = 60 * 60 * 1000;

/**
 * One region's advice, kept on the phone for a farmer who opens it again
 * without signal. The outlook changes once a month, so an hour is plenty fresh.
 */
export function useSeasonalAdvice(region: string, season?: SeasonKey, window?: WindowKey) {
  return useCachedQuery({
    queryKey: ['seasonalAdvice', region, season ?? 'main', window ?? 'main'],
    queryFn: () => getSeasonalAdvice(region, season, window),
    cacheKey: `seasonal-advice:${region}:${season ?? 'main'}:${window ?? 'main'}`,
    enabled: Boolean(region),
    staleTime: HOUR,
    gcTime: 14 * 24 * HOUR,
  });
}

/**
 * The national outlook the map draws, for the month by month table.
 *
 * The same key as the Forecasts screen's query, so coming here from the map
 * costs no request at all.
 */
export function useSeasonalSet() {
  return useQuery({
    queryKey: ['seasonalOutlookSet'],
    queryFn: getSeasonalOutlookSet,
    refetchInterval: (query) => (query.state.data?.computing ? 4000 : false),
  });
}
