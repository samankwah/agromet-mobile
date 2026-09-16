import { getHourlyForecast, getSeasonalOutlook, getWeeklyForecast } from '../../shared/api/forecastService';
import { getCurrentConditions } from '../../shared/api/weatherService';
import { buildOpenMeteoFixture, stubWeatherFetch } from '../fixtures/openMeteo';

// Open-Meteo, stubbed. Without this the suite makes a live request per test —
// slow, flaky, and dependent on someone else's uptime.
beforeEach(() => {
  stubWeatherFetch();
});

describe('forecastService', () => {
  it('getWeeklyForecast returns 7 days for a known town', async () => {
    const forecast = await getWeeklyForecast('accra');
    expect(forecast.days).toHaveLength(7);
  });

  it('getHourlyForecast returns hours strictly in the future for a known town', async () => {
    const hours = await getHourlyForecast('accra');
    expect(hours.length).toBeGreaterThan(0);
    for (const hour of hours) {
      expect(new Date(hour.hour).getTime()).toBeGreaterThan(Date.now());
    }
  });

  it('getHourlyForecast rejects an unknown location', async () => {
    await expect(getHourlyForecast('not-a-real-town')).rejects.toThrow();
  });

  it('getWeeklyForecast carries a summary and actions derived from the numbers', async () => {
    // No weather provider emits these — they are generated from the forecast
    // (see utils/weatherNarrative.ts). Non-optional in the domain type, so an
    // empty one would render as a blank card.
    const forecast = await getWeeklyForecast('accra');
    expect(forecast.summary.length).toBeGreaterThan(0);
    expect(forecast.farmerActionCard.headline.length).toBeGreaterThan(0);
    expect(forecast.farmerActionCard.actions.length).toBeGreaterThan(0);
    for (const day of forecast.days) {
      expect(day.farmerInterpretation.length).toBeGreaterThan(0);
    }
  });

  it('getWeeklyForecast carries no severe-weather alert on a calm forecast', async () => {
    const forecast = await getWeeklyForecast('accra');
    expect(forecast.weatherAlerts).toEqual([]);
  });

  it('getWeeklyForecast surfaces a severe-weather alert when the forecast has one', async () => {
    stubWeatherFetch(buildOpenMeteoFixture({ severe: { 0: { apparentMaxC: 44 } } }));
    const forecast = await getWeeklyForecast('accra');
    expect(forecast.weatherAlerts).toHaveLength(1);
    expect(forecast.weatherAlerts[0].hazardType).toBe('Extreme heat');
    expect(forecast.weatherAlerts[0].district).toBe('Accra');
  });

  it('getWeeklyForecast reports humidity per day, not a zero it never measured', async () => {
    // Open-Meteo has no daily humidity aggregate, so it is meaned from the
    // day's hourly series. Left at zero it would read as very dry air rather
    // than as a missing value.
    const forecast = await getWeeklyForecast('accra');
    for (const day of forecast.days) {
      expect(day.humidityPct).toBeGreaterThan(0);
      expect(day.humidityPct).toBeLessThanOrEqual(100);
    }
  });

  it('getSeasonalOutlook rainfall probability categories sum to ~100 — a probabilistic outlook should never imply more or less than full coverage across its own categories', async () => {
    const outlook = await getSeasonalOutlook('northern');
    const total =
      outlook.rainfallProbability.belowNormalPct + outlook.rainfallProbability.normalPct + outlook.rainfallProbability.aboveNormalPct;
    expect(total).toBe(100);
  });

  it('getSeasonalOutlook always carries a non-empty plain-language summary', async () => {
    const outlook = await getSeasonalOutlook('northern');
    expect(outlook.plainLanguageSummary.length).toBeGreaterThan(0);
  });
});

describe('the shared weather bundle', () => {
  it('is downloaded once when several forecast queries start together', async () => {
    // Current conditions, the hourly strip and the week are separate queries
    // that all fire when the Forecasts tab mounts. They used to fetch the same
    // ~40 KB bundle three times over.
    const fetchMock = stubWeatherFetch();
    await Promise.all([getCurrentConditions('accra'), getHourlyForecast('accra'), getWeeklyForecast('accra')]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('is not kept once settled, so a later refetch gets fresh data', async () => {
    const fetchMock = stubWeatherFetch();
    await getWeeklyForecast('accra');
    await getWeeklyForecast('accra');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
