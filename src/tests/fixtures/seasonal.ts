import type { SeasonalBlock, SeasonalCell, SeasonalReading } from '../../shared/domain/seasonalOutlook';

/** One forecast reading, a strong lean to "below" (earlier, shorter, less) by default. */
export function seasonalReading(overrides: Partial<SeasonalReading> = {}): SeasonalReading {
  return {
    available: true,
    value: 70,
    display: 'Week 2 of March',
    members: 51,
    normal: 85,
    normalDisplay: 'Week 4 of March',
    probabilities: { below: 0.72, normal: 0.18, above: 0.1 },
    category: 'below',
    confidence: 'high',
    noSignal: false,
    ...overrides,
  };
}

/** A season beyond the model's reach: the normal and the month it will be ready. */
export function normalOnly(overrides: Partial<SeasonalReading> = {}): SeasonalReading {
  return { available: false, availableFrom: '2027-05', normal: 280, normalDisplay: 'Week 1 of October', ...overrides };
}

export function seasonalCell(region: string, readings: Partial<SeasonalCell> = {}): SeasonalCell {
  return { id: region, region, lat: 7, lng: -1, ...readings };
}

function seasonCell(region: string, overrides: Partial<SeasonalCell> = {}): SeasonalCell {
  return seasonalCell(region, {
    onset: seasonalReading(),
    cessation: seasonalReading({
      value: 290,
      display: 'Week 3 of October',
      normal: 285,
      normalDisplay: 'Week 2 of October',
      category: 'normal',
      probabilities: { below: 0.3, normal: 0.4, above: 0.3 },
      confidence: 'low',
    }),
    earlyDrySpell: seasonalReading({ value: 6, display: '6 days', normal: 7, normalDisplay: '7 days' }),
    lateDrySpell: seasonalReading({
      value: 9,
      display: '9 days',
      normal: 8,
      normalDisplay: '8 days',
      category: 'above',
      probabilities: { below: 0.1, normal: 0.25, above: 0.65 },
      confidence: 'moderate',
    }),
    ...overrides,
  });
}

function windowCell(region: string, overrides: Partial<SeasonalCell> = {}): SeasonalCell {
  return seasonalCell(region, {
    rainfallTotal: seasonalReading({
      value: 420,
      display: '420 mm',
      normal: 380,
      normalDisplay: '380 mm',
      category: 'above',
      probabilities: { below: 0.1, normal: 0.3, above: 0.6 },
      confidence: 'moderate',
      dryWindow: false,
    }),
    rainyDays: seasonalReading({
      value: 38,
      display: '38 days',
      normal: 35,
      normalDisplay: '35 days',
      category: 'normal',
      probabilities: { below: 0.3, normal: 0.4, above: 0.3 },
      confidence: 'low',
    }),
    temperature: seasonalReading({
      value: 32.4,
      display: '32.4°C',
      normal: 31.8,
      normalDisplay: '31.8°C',
      category: 'above',
      probabilities: { below: 0.05, normal: 0.25, above: 0.7 },
    }),
    ...overrides,
  });
}

function block(key: string, label: string, cells: SeasonalCell[]): SeasonalBlock {
  return { key, label, year: 2027, cells };
}

const allNormal = (region: string, variables: string[]) =>
  seasonalCell(region, Object.fromEntries(variables.map((name) => [name, normalOnly()])));

/** The `data` of a `/api/outlook/seasonal` response. */
export function seasonalPayload(overrides: Record<string, unknown> = {}) {
  return {
    source: 'seas5',
    issuedBy: null,
    issuedAt: '2026-10-02T00:00:00Z',
    runDate: '2026-10-01',
    reachEnd: '2027-05-04',
    seasons: {
      'southern-major': block('southern-major', 'Southern Major Season', [seasonCell('Greater Accra'), seasonCell('Ashanti')]),
      'southern-minor': block('southern-minor', 'Southern Minor Season', [
        allNormal('Greater Accra', ['onset', 'cessation', 'earlyDrySpell', 'lateDrySpell']),
      ]),
      northern: block('northern', 'Northern Single Season', [seasonCell('Northern')]),
    },
    windows: {
      MAM: block('MAM', 'March to May', [
        windowCell('Greater Accra'),
        windowCell('Northern', {
          rainfallTotal: seasonalReading({ value: 40, display: '40 mm', normal: 60, normalDisplay: '60 mm', dryWindow: true }),
        }),
      ]),
      MJJ: block('MJJ', 'May to July', [windowCell('Greater Accra')]),
      JAS: block('JAS', 'July to September', [allNormal('Greater Accra', ['rainfallTotal', 'rainyDays', 'temperature'])]),
    },
    modelSeasons: {},
    modelWindows: {},
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
