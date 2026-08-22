import { getSeverityMeta } from '../../shared/domain/alertSeverity';
import {
  alertSeverityForBand,
  compareBandDesc,
  getHazardBandMeta,
  HAZARD_BAND_ORDER,
  isElevatedBand,
  type HazardBand,
} from '../../shared/domain/hazardBand';

/**
 * The band type is a firewall around `getSeverityMeta`, which throws. These
 * cover the ways that firewall could be breached.
 */

describe('getHazardBandMeta', () => {
  it('covers every band in the order list', () => {
    for (const band of HAZARD_BAND_ORDER) {
      expect(getHazardBandMeta(band).band).toBe(band);
    }
  });

  /* Unlike getSeverityMeta, this must never throw: bands arrive from a network
     payload, so a backend that adds a seventh must degrade, not white-screen. */
  it('falls back instead of throwing on an unrecognised band', () => {
    expect(() => getHazardBandMeta('apocalyptic')).not.toThrow();
    expect(() => getHazardBandMeta(undefined)).not.toThrow();
    expect(() => getHazardBandMeta('')).not.toThrow();
  });

  /* Falling back to "normal" would tell a farmer that a region we failed to
     understand is safe. "No data" is the only honest default. */
  it('falls back to no-data rather than to normal', () => {
    expect(getHazardBandMeta('apocalyptic').band).toBe('unavailable');
    expect(getHazardBandMeta(null).label).toBe('No data');
  });

  it('fills no meter segments when there is no reading', () => {
    expect(getHazardBandMeta('unavailable').steps).toBe(0);
    expect(getHazardBandMeta('extreme').steps).toBe(5);
  });

  it('gives every band a screen-reader label longer than its visible label', () => {
    for (const band of HAZARD_BAND_ORDER) {
      const meta = getHazardBandMeta(band);
      expect(meta.a11yLabel.length).toBeGreaterThan(meta.label.length);
    }
  });
});

describe('ordering', () => {
  it('sorts worst first', () => {
    const sorted = [...HAZARD_BAND_ORDER].sort(compareBandDesc);
    expect(sorted).toEqual(['extreme', 'severe', 'moderate', 'watch', 'normal', 'unavailable']);
  });

  it('treats moderate and above as elevated, and no-data as not', () => {
    expect(isElevatedBand('moderate')).toBe(true);
    expect(isElevatedBand('severe')).toBe(true);
    expect(isElevatedBand('extreme')).toBe(true);
    expect(isElevatedBand('watch')).toBe(false);
    expect(isElevatedBand('normal')).toBe(false);
    expect(isElevatedBand('unavailable')).toBe(false);
  });
});

describe('alertSeverityForBand', () => {
  /* The whole table, because getting one row wrong either silences a real
     warning or lights the banner permanently. */
  it('maps every band exactly once', () => {
    const table: Record<HazardBand, ReturnType<typeof alertSeverityForBand>> = {
      unavailable: null,
      normal: null,
      watch: null,
      moderate: 'watch',
      severe: 'warning',
      extreme: 'emergency',
    };
    for (const [band, expected] of Object.entries(table)) {
      expect(alertSeverityForBand(band)).toBe(expected);
    }
  });

  /* Band `watch` is the ordinary state of much of the country in the rainy
     season. Emitting on it would leave the banner always lit, which trains
     people to ignore it. */
  it('raises nothing below moderate', () => {
    expect(alertSeverityForBand('watch')).toBeNull();
    expect(alertSeverityForBand('normal')).toBeNull();
  });

  it('raises nothing for a band it does not recognise', () => {
    expect(alertSeverityForBand('apocalyptic')).toBeNull();
    expect(alertSeverityForBand(undefined)).toBeNull();
  });

  /* The point of the whole separation: anything this function returns must be
     safe to hand to getSeverityMeta, which throws on unknown input. */
  it('only ever returns severities getSeverityMeta accepts', () => {
    for (const band of HAZARD_BAND_ORDER) {
      const severity = alertSeverityForBand(band);
      if (severity) expect(() => getSeverityMeta(severity)).not.toThrow();
    }
  });

  /* A regression guard for the one genuinely confusing thing here: `watch`
     exists in both unions and means different things. */
  it('does not confuse band watch with severity watch', () => {
    expect(alertSeverityForBand('watch')).not.toBe('watch');
    expect(alertSeverityForBand('moderate')).toBe('watch');
  });
});
