import type { SeasonalAdvice, SeasonalAdviceItem } from '../domain/seasonalAdvice';
import type { SeasonKey, WindowKey } from '../domain/seasonalOutlook';
import { SEASONAL_VARIABLES } from '../domain/seasonalOutlook';
import { getJson } from './http';

type ApiPayload = Partial<SeasonalAdvice> & { conditions?: Partial<SeasonalAdviceItem>[] };

/**
 * One region's seasonal advice, from `/api/outlook/seasonal/advice/{region}`.
 *
 * `season` and `window` are optional: the server picks the region's main
 * season and its heart. Conditions the app does not know are dropped rather
 * than drawn with a blank label, and the rest are put in the drawer's order.
 */
export async function getSeasonalAdvice(region: string, season?: SeasonKey, window?: WindowKey): Promise<SeasonalAdvice> {
  const payload = await getJson<ApiPayload>(`/api/outlook/seasonal/advice/${encodeURIComponent(region)}`, { season, window });

  const conditions = (payload.conditions ?? [])
    .filter((item): item is SeasonalAdviceItem => Boolean(item.variable && SEASONAL_VARIABLES.includes(item.variable) && item.title))
    .map((item) => ({ ...item, actions: item.actions ?? [], reading: item.reading ?? {} }))
    .sort((a, b) => SEASONAL_VARIABLES.indexOf(a.variable) - SEASONAL_VARIABLES.indexOf(b.variable));

  return {
    region: payload.region ?? region,
    season: payload.season ?? { key: season ?? 'southern-major', label: '', year: null },
    window: payload.window ?? { key: window ?? 'MAM', label: '', year: null },
    headline: payload.headline ?? '',
    conditions,
    note: payload.note ?? '',
    source: payload.source === 'published' ? 'published' : 'rules',
    issuedBy: payload.issuedBy ?? null,
    issuedAt: payload.issuedAt ?? null,
    outlookSource: payload.outlookSource ?? null,
    outlookIssuedBy: payload.outlookIssuedBy ?? null,
    runDate: payload.runDate ?? null,
    unavailable: Boolean(payload.unavailable),
  };
}
