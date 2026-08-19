import { getHourlyForecast, getSeasonalOutlook, getWeeklyForecast } from '../../shared/api/forecastService';

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
