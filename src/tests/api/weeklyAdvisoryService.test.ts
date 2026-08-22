import { getWeeklyAdvisory, listAdvisoryActivities } from '../../shared/api/weeklyAdvisoryService';
import { MOCK_CROP_ADVISORY } from '../../shared/data/mockWeeklyAdvisory';

/**
 * The service's job is turning what the spreadsheet parser happens to emit into
 * something a screen can render without knowing any of that. These cover the
 * reshaping, and the two ways the backend can leave the screen with nothing.
 */

function respondWith(body: unknown) {
  globalThis.fetch = jest.fn(() =>
    Promise.resolve({ ok: true, json: () => Promise.resolve(body) } as Response),
  ) as unknown as typeof fetch;
}

function rejectNetwork() {
  globalThis.fetch = jest.fn(() =>
    Promise.reject(new TypeError('Network request failed')),
  ) as unknown as typeof fetch;
}

const FILTER = { zone: '', region: 'Ashanti Region', district: 'Ejisu', subject: 'Maize' };

/** One worksheet, as `_parse_agromet_sheet` writes it. */
const CROP_SHEET = {
  activity: 'Land preparation',
  metadata: {
    zone: 'Forest',
    region: 'REG02/Ashanti Region',
    district: 'DIS14/Ejisu',
    month_year: 'August 2026',
    week: 'Week 32',
    start_date: '2026-08-10',
    end_date: '2026-08-16',
    crop: 'CROP01/Maize',
  },
  weatherParameters: ['RAINFALL', 'TEMP', 'HUMIDITY'],
  forecast: { RAINFALL: '15-25 mm', TEMP: '24-31 °C' },
  implication: { RAINFALL: 'Adequate soil moisture', TEMP: '-' },
  advisory: { RAINFALL: 'Delay top-dressing until rain subsides' },
  summaryTitle: 'MODERATE RAINS',
  summaryBody: 'Moderate rainfall is expected this week.',
};

afterEach(() => jest.restoreAllMocks());

describe('reshaping a crop advisory', () => {
  it('zips the three parallel maps into one row per parameter, in the sheet order', async () => {
    respondWith({ success: true, data: { id: 7, advisoryType: 'agromet-advisory', advisories: [CROP_SHEET] } });

    const { data } = await getWeeklyAdvisory(7, 'crop');
    const [activity] = data.activities;

    expect(activity.rows.map((row) => row.parameter)).toEqual(['RAINFALL', 'TEMP', 'HUMIDITY']);
    expect(activity.rows[0]).toEqual({
      parameter: 'RAINFALL',
      forecast: '15-25 mm',
      implication: 'Adequate soil moisture',
      advisory: 'Delay top-dressing until rain subsides',
    });
  });

  /* The parser writes a literal "-" for a blank cell, but a hand-edited
     bulletin can be missing the key altogether. Both must read the same. */
  it('fills a missing cell with a dash rather than undefined', async () => {
    respondWith({ success: true, data: { id: 7, advisoryType: 'agromet-advisory', advisories: [CROP_SHEET] } });

    const { data } = await getWeeklyAdvisory(7, 'crop');
    const humidity = data.activities[0].rows.find((row) => row.parameter === 'HUMIDITY')!;

    expect(humidity.forecast).toBe('-');
    expect(humidity.implication).toBe('-');
    expect(humidity.advisory).toBe('-');
  });

  it('keeps only the readable half of a CODE/Name metadata value', async () => {
    respondWith({ success: true, data: { id: 7, advisoryType: 'agromet-advisory', advisories: [CROP_SHEET] } });

    const { metadata } = (await getWeeklyAdvisory(7, 'crop')).data.activities[0];

    expect(metadata.region).toBe('Ashanti Region');
    expect(metadata.district).toBe('Ejisu');
    expect(metadata.crop).toBe('Maize');
    // A value with no code prefix must survive untouched.
    expect(metadata.zone).toBe('Forest');
  });

  it('carries the per-activity summary, not the bulletin-level one', async () => {
    respondWith({
      success: true,
      data: { id: 7, advisoryType: 'agromet-advisory', summary: 'Parsed 1 advisory activity', advisories: [CROP_SHEET] },
    });

    const { data } = await getWeeklyAdvisory(7, 'crop');

    expect(data.activities[0].summaryBody).toBe('Moderate rainfall is expected this week.');
    // The top-level summary is the uploader's note, kept but never shown as advice.
    expect(data.summary).toBe('Parsed 1 advisory activity');
  });
});

describe('reshaping a poultry advisory', () => {
  it('reads plain strings as recommendations and the forecast column as metrics', async () => {
    respondWith({
      success: true,
      data: {
        id: 9,
        advisoryType: 'poultry-advisory',
        advisories: ['Vaccinate at day 7', 'Increase midday ventilation'],
        weatherForecast: { 'Brooding temperature': '32-34 °C', 'Stocking density': '10 birds/m2' },
      },
    });

    const { data } = await getWeeklyAdvisory(9, 'poultry');

    expect(data.kind).toBe('poultry');
    expect(data.recommendations).toEqual(['Vaccinate at day 7', 'Increase midday ventilation']);
    expect(data.managementMetrics['Brooding temperature']).toBe('32-34 °C');
    // There is no forecast in a poultry bulletin, so there are no activities.
    expect(data.activities).toEqual([]);
  });
});

/* A crop bulletin whose worksheets failed to parse degrades to a string array
   indistinguishable from a poultry one. Trusting advisoryType here would mean
   trying to draw a forecast table out of strings. */
describe('a crop advisory that degraded to plain strings', () => {
  it('is partitioned by what the elements are, not by the type field', async () => {
    respondWith({
      success: true,
      data: { id: 7, advisoryType: 'agromet-advisory', advisories: ['Monitor drainage', 'Inspect fields'] },
    });

    const { data } = await getWeeklyAdvisory(7, 'crop');

    expect(data.activities).toEqual([]);
    expect(data.recommendations).toHaveLength(2);
  });
});

describe('when there is nothing to show', () => {
  /* The advisory tables are empty in every database today, so this is the
     normal case rather than an edge one. */
  it('reports empty when the server publishes nothing for the district', async () => {
    respondWith({ success: true, data: [] });

    const result = await listAdvisoryActivities(FILTER);

    expect(result.fallback).toBe('empty');
    expect(result.data).toEqual([]);
  });

  it('reports offline when the server cannot be reached', async () => {
    rejectNetwork();

    expect((await listAdvisoryActivities(FILTER)).fallback).toBe('offline');
    expect((await getWeeklyAdvisory(1, 'crop')).fallback).toBe('offline');
  });

  it('falls back to the seeded bulletin rather than nothing at all', async () => {
    rejectNetwork();

    const { data } = await getWeeklyAdvisory(1, 'crop');

    expect(data.id).toBe(MOCK_CROP_ADVISORY.id);
    expect(data.activities.length).toBeGreaterThan(0);
  });

  it('maps the activities list out of its snake_case shape', async () => {
    respondWith({
      success: true,
      data: [{ id: 5, advisory_id: 2, activity: 'MAIZE', week_label: 'Week 32', region: 'Ashanti Region', district: 'Ejisu', crop: 'maize', year: 2026 }],
    });

    const [ref] = (await listAdvisoryActivities(FILTER)).data;

    expect(ref).toMatchObject({ id: 5, advisoryId: 2, activity: 'MAIZE', weekLabel: 'Week 32' });
  });
});
