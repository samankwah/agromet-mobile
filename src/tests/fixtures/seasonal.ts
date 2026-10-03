import type { SeasonalCell, SeasonalVariable, SeasonalWindow } from '../../shared/domain/seasonalOutlook';

/** One reading, a strong lean to drier by default. */
export function seasonalReading(overrides: Partial<SeasonalVariable> = {}): SeasonalVariable {
  return {
    value: 180,
    members: 51,
    normal: 240,
    biasCorrected: true,
    probabilities: { below: 0.72, normal: 0.18, above: 0.1 },
    category: 'below',
    confidence: 'high',
    noSignal: false,
    dryWindow: false,
    ...overrides,
  };
}

export function seasonalCell(region: string, overrides: Partial<SeasonalCell> = {}): SeasonalCell {
  return {
    id: region,
    region,
    lat: 7,
    lng: -1,
    rainfall: seasonalReading(),
    temperature: seasonalReading({
      value: 33.4,
      normal: 32.8,
      probabilities: { below: 0.05, normal: 0.25, above: 0.7 },
      category: 'above',
    }),
    ...overrides,
  };
}

export function seasonalWindow(key: string, label: string, cells: SeasonalCell[]): SeasonalWindow {
  const startMonth = Number(key.slice(5));
  return { key, startMonth, label, start: `${key}-01`, end: `${key}-28`, cells };
}

/** The `data` of a `/api/outlook/seasonal` response. */
export function seasonalPayload(overrides: Record<string, unknown> = {}) {
  return {
    source: 'seas5',
    issuedBy: null,
    issuedAt: '2026-10-02T00:00:00Z',
    runDate: '2026-10-01',
    windows: [
      seasonalWindow('2026-11', 'Nov to Jan', [
        seasonalCell('Greater Accra'),
        seasonalCell('Northern', { rainfall: seasonalReading({ dryWindow: true, value: 4, normal: 6 }) }),
      ]),
      seasonalWindow('2026-12', 'Dec to Feb', [
        seasonalCell('Greater Accra', {
          rainfall: seasonalReading({ category: 'normal', probabilities: { below: 0.3, normal: 0.4, above: 0.3 }, confidence: 'low' }),
        }),
      ]),
      seasonalWindow('2027-01', 'Jan to Mar', [seasonalCell('Greater Accra')]),
    ],
    modelWindows: [],
    unavailable: false,
    model: 'ECMWF SEAS5 (51 members), adjusted to local climate',
    baseline: 'ERA5 1995-2024',
    geography: 'region',
    stale: false,
    hasClimatology: true,
    sources: [],
    error: null,
    computing: false,
    fetchFailed: false,
    ...overrides,
  };
}
