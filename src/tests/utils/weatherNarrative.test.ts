import type { DailyForecast, HourlyForecast } from '../../shared/domain/forecast';
import { describeNextHours, partOfDay } from '../../shared/utils/weatherNarrative';

/**
 * The card on the Daily tab used to read the whole calendar day, so it said
 * the same thing at six in the morning as at nine at night. These lock in
 * that it now reads the hours ahead, and speaks about the stretch of day the
 * reader is standing in.
 */

const DAY: DailyForecast = {
  locationId: 'accra',
  date: '2026-09-15',
  tempMinC: 25,
  tempMaxC: 29,
  condition: 'Overcast',
  weatherCode: 3,
  isDay: true,
  rainfallProbabilityPct: 96,
  rainfallMm: 12,
  windKph: 12,
  humidityPct: 86,
  farmerInterpretation: 'Rain likely, about 12 mm. Field work will stop; cover anything you have harvested.',
};

function hour(at: string, overrides: Partial<HourlyForecast> = {}): HourlyForecast {
  return {
    locationId: 'accra',
    hour: at,
    tempC: 25,
    feelsLikeC: 29,
    condition: 'Overcast',
    weatherCode: 3,
    isDay: false,
    rainfallProbabilityPct: 5,
    rainfallMm: 0,
    humidityPct: 86,
    windKph: 12,
    uvIndex: 0,
    ...overrides,
  };
}

describe('partOfDay', () => {
  it.each([
    ['2026-09-15T02:00:00.000Z', 'night'],
    ['2026-09-15T08:00:00.000Z', 'morning'],
    ['2026-09-15T13:00:00.000Z', 'afternoon'],
    ['2026-09-15T18:00:00.000Z', 'evening'],
    ['2026-09-15T21:11:00.000Z', 'night'],
  ])('reads %s as %s', (at, expected) => {
    expect(partOfDay(new Date(at))).toBe(expected);
  });
});

describe('describeNextHours', () => {
  it('speaks about tonight, not today, after dark', () => {
    const hours = [hour('2026-09-15T22:00:00.000Z', { rainfallProbabilityPct: 70, rainfallMm: 2 })];
    const narrative = describeNextHours(hours, DAY, new Date('2026-09-15T21:11:00.000Z'));

    expect(narrative.headline).toBe('Showers tonight');
    expect(narrative.body).toContain('10 PM');
    expect(narrative.body).not.toContain('drying crops close to cover');
  });

  it('gives the same weather a different reading in the morning', () => {
    const hours = [hour('2026-09-15T09:00:00.000Z', { rainfallProbabilityPct: 70, rainfallMm: 2, isDay: true })];
    const narrative = describeNextHours(hours, DAY, new Date('2026-09-15T08:30:00.000Z'));

    expect(narrative.headline).toBe('Showers this morning');
    expect(narrative.body).toContain('Keep drying crops close to cover.');
  });

  // The rainy season's standing 96-100% probability, over almost no rain.
  // This is the case that made the card look hardcoded from May to October.
  it('calls a near-certain drizzle light rain, not showers', () => {
    const hours = [
      hour('2026-09-15T14:00:00.000Z', { rainfallProbabilityPct: 96, rainfallMm: 0.1, isDay: true }),
      hour('2026-09-15T15:00:00.000Z', { rainfallProbabilityPct: 90, rainfallMm: 0.1, isDay: true }),
    ];
    const narrative = describeNextHours(hours, DAY, new Date('2026-09-15T13:30:00.000Z'));

    expect(narrative.headline).toBe('Light rain this afternoon');
    expect(narrative.body).toContain('2 PM');
    expect(narrative.body).not.toContain('Keep drying crops close to cover.');
  });

  it('names the hour the rain is likeliest, so the card moves as it passes', () => {
    const hours = [
      hour('2026-09-15T12:00:00.000Z', { rainfallProbabilityPct: 60, rainfallMm: 0.5, isDay: true }),
      hour('2026-09-15T15:00:00.000Z', { rainfallProbabilityPct: 95, rainfallMm: 1.5, isDay: true }),
    ];
    const narrative = describeNextHours(hours, DAY, new Date('2026-09-15T11:30:00.000Z'));

    expect(narrative.body).toContain('around 3 PM');
  });

  it('stays dry when the rain has already passed, even on a wet day', () => {
    // The day totals 12 mm at 96%, but none of it falls in the hours ahead.
    const hours = [hour('2026-09-15T22:00:00.000Z'), hour('2026-09-15T23:00:00.000Z')];
    const narrative = describeNextHours(hours, DAY, new Date('2026-09-15T21:11:00.000Z'));

    expect(narrative.headline).toBe('A dry night');
    expect(narrative.body).toContain('No rain expected');
  });

  it('totals the rain over the window rather than the day', () => {
    const hours = [
      hour('2026-09-15T13:00:00.000Z', { rainfallProbabilityPct: 80, rainfallMm: 3, isDay: true }),
      hour('2026-09-15T14:00:00.000Z', { rainfallProbabilityPct: 90, rainfallMm: 4, isDay: true }),
    ];
    const narrative = describeNextHours(hours, DAY, new Date('2026-09-15T12:40:00.000Z'));

    expect(narrative.headline).toBe('Heavy rain this afternoon');
    expect(narrative.body).toContain('About 7 mm');
    expect(narrative.body).toContain('heaviest around 2 PM');
  });

  it('reads heat from the hours ahead, not the day maximum', () => {
    const hours = [hour('2026-09-15T13:00:00.000Z', { tempC: 35, rainfallProbabilityPct: 5, isDay: true })];
    const narrative = describeNextHours(hours, DAY, new Date('2026-09-15T12:40:00.000Z'));

    expect(narrative.headline).toBe('Hot this afternoon');
    expect(narrative.body).toContain('35°C');
  });

  it('falls back to the whole-day reading when no hours are left', () => {
    const narrative = describeNextHours([], DAY, new Date('2026-09-15T23:40:00.000Z'));
    expect(narrative.body).toBe(DAY.farmerInterpretation);
  });
});
