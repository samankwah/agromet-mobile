import { synthesiseWeatherAlerts } from '../../shared/domain/weatherHazards';
import { alertProvenanceLine } from '../../shared/domain/weatherAlert';
import { buildOpenMeteoFixture, type FixtureOptions } from '../fixtures/openMeteo';

/**
 * The severe-weather synthesiser that feeds the banner. What matters: it stays
 * silent on a calm day (the flood index it replaced never did), fires exactly at
 * each threshold, and reads today and tomorrow but nothing further out.
 */

const PLACE = { locationId: 'kumasi', locationName: 'Kumasi', region: 'Ashanti' };

function alertsFor(severe: FixtureOptions['severe']) {
  return synthesiseWeatherAlerts(buildOpenMeteoFixture({ severe }) as never, PLACE);
}

describe('synthesiseWeatherAlerts', () => {
  it('says nothing on a calm day', () => {
    expect(synthesiseWeatherAlerts(buildOpenMeteoFixture() as never, PLACE)).toEqual([]);
  });

  it('returns nothing for an empty bundle', () => {
    expect(synthesiseWeatherAlerts({} as never, PLACE)).toEqual([]);
  });

  describe('thunderstorm', () => {
    it('warns on weather code 95', () => {
      const [alert] = alertsFor({ 0: { weatherCode: 95 } });
      expect(alert.hazardType).toBe('Thunderstorm');
      expect(alert.severity).toBe('warning');
      expect(alert.headline).toMatch(/thunderstorms likely this (morning|afternoon|evening)|thunderstorms likely tonight|thunderstorms likely today/i);
      expect(alert.district).toBe('Kumasi');
    });

    it('escalates to an emergency when hail is in the code', () => {
      const [alert] = alertsFor({ 0: { weatherCode: 96 } });
      expect(alert.severity).toBe('emergency');
      expect(alert.headline).toMatch(/hail/i);
      expect(alert.urgency).toBe('immediate');
    });

    it('carries an onset from the hourly storm window for today', () => {
      const [alert] = alertsFor({ 0: { weatherCode: 95 } });
      expect(alert.onset).toBeDefined();
    });
  });

  describe('heavy rain', () => {
    it('warns at 30 mm with a better-than-even chance', () => {
      const [alert] = alertsFor({ 0: { weatherCode: 61, rainMm: 34, rainProbability: 80 } });
      expect(alert.hazardType).toBe('Heavy rain');
      expect(alert.severity).toBe('warning');
      expect(alert.headline).toMatch(/around 34 mm/);
    });

    it('is an emergency past 60 mm', () => {
      const [alert] = alertsFor({ 0: { weatherCode: 61, rainMm: 72, rainProbability: 90 } });
      expect(alert.severity).toBe('emergency');
    });

    it('holds back a heavy total the forecast is not confident about', () => {
      expect(alertsFor({ 0: { weatherCode: 61, rainMm: 40, rainProbability: 35 } })).toEqual([]);
    });

    it('does not fire below the threshold', () => {
      expect(alertsFor({ 0: { weatherCode: 61, rainMm: 18, rainProbability: 90 } })).toEqual([]);
    });
  });

  describe('extreme heat', () => {
    it('warns at 40°C feels-like', () => {
      const [alert] = alertsFor({ 0: { apparentMaxC: 41 } });
      expect(alert.hazardType).toBe('Extreme heat');
      expect(alert.severity).toBe('warning');
      expect(alert.headline).toMatch(/feels like 41°C/);
    });

    it('is an emergency at 43°C', () => {
      const [alert] = alertsFor({ 0: { apparentMaxC: 44 } });
      expect(alert.severity).toBe('emergency');
    });

    it('stays quiet below 40°C', () => {
      expect(alertsFor({ 0: { apparentMaxC: 38 } })).toEqual([]);
    });
  });

  describe('strong wind', () => {
    it('warns at 60 km/h gusts', () => {
      const [alert] = alertsFor({ 0: { windGustKph: 64 } });
      expect(alert.hazardType).toBe('Strong wind');
      expect(alert.severity).toBe('warning');
      expect(alert.headline).toMatch(/gusts to 64 km\/h/);
    });

    it('is an emergency at 85 km/h', () => {
      const [alert] = alertsFor({ 0: { windGustKph: 90 } });
      expect(alert.severity).toBe('emergency');
    });
  });

  describe('today vs tomorrow', () => {
    it('reads tomorrow as well, but marks it less certain and not immediate', () => {
      const [alert] = alertsFor({ 1: { weatherCode: 96 } });
      expect(alert.headline).toMatch(/tomorrow/);
      expect(alert.certainty).toBe('possible');
      expect(alert.urgency).toBe('expected'); // an emergency, but a day away — banner not popup
    });

    it('ignores a storm three days out', () => {
      expect(alertsFor({ 3: { weatherCode: 95 } })).toEqual([]);
    });

    it('puts today ahead of tomorrow at the same severity', () => {
      const alerts = alertsFor({ 0: { windGustKph: 64 }, 1: { weatherCode: 95 } });
      expect(alerts[0].headline).toMatch(/gusts/); // today's warning first
      expect(alerts[1].headline).toMatch(/tomorrow/);
    });
  });

  it('expires each alert at the end of its own day', () => {
    const [alert] = alertsFor({ 0: { apparentMaxC: 41 } });
    expect(alert.expiresAt).toMatch(/T23:59:59\.000Z$/);
    expect(alert.provenance).toBe('computed');
    expect(alert.source).toBe('AgroMet forecast (Open-Meteo)');
  });

  it('is credited to the forecast, not the flood model', () => {
    const [alert] = alertsFor({ 0: { apparentMaxC: 41 } });
    // "Expected · likely · AgroMet forecast" — the parenthetical data source is
    // trimmed for the caption, and it must not read "AgroMet hazard model".
    expect(alertProvenanceLine(alert)).toBe('Expected · likely · AgroMet forecast');
  });
});
