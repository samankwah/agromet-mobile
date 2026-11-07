import { firstDueTime, isWarningDue, warningNotificationText } from '../../shared/domain/warningTiming';
import type { WeatherAlert } from '../../shared/domain/weatherAlert';

/** Mirrors `DueTests` in backend/tests/test_weather_warnings.py, so the backup
 * notifications on the phone go out when the pushed ones would. */
const warning = (date: string, overrides: Partial<WeatherAlert> = {}): WeatherAlert =>
  ({
    id: `weather:atebubu:extreme-heat:${date}`,
    headline: 'Extreme heat today, feels like 41°C',
    district: 'Atebubu',
    region: 'Bono East',
    hazardType: 'Extreme heat',
    severity: 'warning',
    issuedAt: `${date}T00:00:00.000Z`,
    expiresAt: `${date}T23:59:59.000Z`,
    urgency: 'expected',
    certainty: 'likely',
    provenance: 'computed',
    evidence: [],
    farmerActions: [],
    source: 'AgroMet forecast (Open-Meteo)',
    ...overrides,
  }) as WeatherAlert;

const at = (stamp: string) => new Date(stamp);

describe('isWarningDue', () => {
  it("sends tomorrow's warning from six the evening before", () => {
    expect(isWarningDue(warning('2026-11-08'), at('2026-11-07T17:59:00Z'))).toBe(false);
    expect(isWarningDue(warning('2026-11-08'), at('2026-11-07T18:00:00Z'))).toBe(true);
  });

  it("sends today's warning from six in the morning", () => {
    expect(isWarningDue(warning('2026-11-07'), at('2026-11-07T05:30:00Z'))).toBe(false);
    expect(isWarningDue(warning('2026-11-07'), at('2026-11-07T06:00:00Z'))).toBe(true);
  });

  it('sends nothing after it has expired', () => {
    expect(isWarningDue(warning('2026-11-06'), at('2026-11-07T08:00:00Z'))).toBe(false);
  });

  it('keeps quiet at night except for emergencies', () => {
    expect(isWarningDue(warning('2026-11-07'), at('2026-11-07T21:30:00Z'))).toBe(false);
    expect(isWarningDue(warning('2026-11-07', { severity: 'emergency' }), at('2026-11-07T21:30:00Z'))).toBe(true);
  });

  it('sends a storm warning two hours before it starts', () => {
    const storm = warning('2026-11-07', { id: 'weather:x:thunderstorm:2026-11-07', onset: '2026-11-07T15:00:00.000Z' });
    expect(isWarningDue(storm, at('2026-11-07T12:30:00Z'))).toBe(false);
    expect(isWarningDue(storm, at('2026-11-07T13:00:00Z'))).toBe(true);
  });
});

describe('firstDueTime', () => {
  it('is now when the warning is already due', () => {
    expect(firstDueTime(warning('2026-11-07'), at('2026-11-07T10:15:00Z'))?.toISOString()).toBe('2026-11-07T10:15:00.000Z');
  });

  it('waits for the morning when found at night', () => {
    expect(firstDueTime(warning('2026-11-08'), at('2026-11-07T22:00:00Z'))?.toISOString()).toBe('2026-11-08T06:00:00.000Z');
  });

  it("waits for the evening before for tomorrow's", () => {
    expect(firstDueTime(warning('2026-11-08'), at('2026-11-07T09:00:00Z'))?.toISOString()).toBe('2026-11-07T18:00:00.000Z');
  });

  it('waits for two hours before a storm', () => {
    const storm = warning('2026-11-07', { id: 'weather:x:thunderstorm:2026-11-07', onset: '2026-11-07T15:00:00.000Z' });
    expect(firstDueTime(storm, at('2026-11-07T09:00:00Z'))?.toISOString()).toBe('2026-11-07T13:00:00.000Z');
  });

  it('is never for a warning that has expired', () => {
    expect(firstDueTime(warning('2026-11-06'), at('2026-11-07T09:00:00Z'))).toBeNull();
  });
});

describe('warningNotificationText', () => {
  it('words it as the server does', () => {
    expect(warningNotificationText(warning('2026-11-07'))).toEqual({
      title: 'Extreme heat warning',
      body: 'Extreme heat today, feels like 41°C. Atebubu, Bono East',
    });
  });
});
