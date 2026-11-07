import type { OpenMeteoBundle } from '../../shared/api/openMeteo';
import { synthesiseWeatherAlerts } from '../../shared/domain/weatherHazards';
import { dateOf, hazardOf } from '../../shared/domain/warningTiming';
import cases from '../fixtures/weather_warnings_cases.json';

/**
 * The same cases the server's `backend/tests/test_weather_warnings.py` runs,
 * from a copy of the same file. The banner here and the notification the
 * server sends must say the same thing: change a threshold or a phrase on one
 * side only and one of the two tests fails.
 */
type Case = {
  name: string;
  now: string;
  bundle: OpenMeteoBundle;
  expected: { hazard: string; severity: string; date: string; headline: string }[];
};

const fixture = cases as unknown as { cases: Case[] };

const PLACE = { locationId: 'accra', locationName: 'Accra', region: 'Greater Accra' };

describe('weather warnings match the server', () => {
  it.each(fixture.cases.map((c) => [c.name, c] as const))('%s', (_name, testCase) => {
    const got = synthesiseWeatherAlerts(testCase.bundle, PLACE, new Date(testCase.now)).map((alert) => ({
      hazard: hazardOf(alert),
      severity: alert.severity,
      date: dateOf(alert),
      headline: alert.headline,
    }));
    expect(got).toEqual(testCase.expected);
  });
});
