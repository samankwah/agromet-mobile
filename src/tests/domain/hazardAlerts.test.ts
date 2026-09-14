import type { HazardBlock, HazardRegion, HazardSummary } from '../../shared/domain/hazard';
import {
  BULLETIN_FALLBACK_VALIDITY_HOURS,
  HAZARD_ALERT_VALIDITY_MINUTES,
  hazardAlertId,
  reachesBanner,
  synthesiseAlerts,
} from '../../shared/domain/hazardAlerts';
import type { AlertSeverity } from '../../shared/domain/alertSeverity';
import { alertProvenanceLine, type WeatherAlert } from '../../shared/domain/weatherAlert';

const COMPUTED_AT = '2026-08-20T06:00:00.000Z';

function block(overrides: Partial<HazardBlock> = {}): HazardBlock {
  return {
    score: 70,
    band: 'severe',
    drivers: [
      {
        key: 'discharge',
        label: 'River discharge',
        value: 5127.6,
        unit: 'm3/s',
        score: 80,
        weight: 0.4,
        percentile: 89,
        gloss: 'Higher than 89% of daily flows on this reach since 1995',
      },
      { key: 'rain7d', label: '7-day rainfall', value: null, unit: 'mm', score: 0, weight: 0.3, percentile: null, gloss: '' },
    ],
    advisories: ['Move livestock to higher ground now.'],
    overridden: false,
    source: 'open-meteo',
    ...overrides,
  };
}

function region(name: string, overrides: Partial<HazardRegion> = {}): HazardRegion {
  return {
    region: name,
    agroZone: 'Guinea Savannah',
    centroid: [9, -1],
    riverPoint: [9, -1],
    riverine: true,
    flood: block(),
    drought: block({ band: 'normal', score: 10, advisories: [] }),
    dominant: 'flood',
    ...overrides,
  };
}

function summary(regions: HazardRegion[], overrides: Partial<HazardSummary> = {}): HazardSummary {
  return {
    regions,
    national: null,
    unavailable: false,
    computedAt: COMPUTED_AT,
    stale: false,
    baseline: 'ERA5 1995-2024',
    hasClimatology: true,
    sources: [{ id: 'open-meteo', label: 'Open-Meteo' }, { id: 'glofas', label: 'GloFAS v4' }],
    ...overrides,
  };
}

describe('synthesiseAlerts', () => {
  it('raises an alert for a severe reading', () => {
    const alerts = synthesiseAlerts(summary([region('Northern')]), []);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].severity).toBe('warning');
    expect(alerts[0].hazardType).toBe('Flood');
    expect(alerts[0].region).toBe('Northern');
  });

  /* The core of the migration. Every region carries a band every day, so
     emitting below moderate would leave the banner permanently lit. */
  it('stays silent for normal, watch and no-data readings', () => {
    for (const band of ['normal', 'watch', 'unavailable'] as const) {
      const alerts = synthesiseAlerts(
        summary([region('Northern', { flood: block({ band }), drought: block({ band, advisories: [] }) })]),
        [],
      );
      expect(alerts).toHaveLength(0);
    }
  });

  it('stays silent when there is nothing to advise', () => {
    const alerts = synthesiseAlerts(
      summary([region('Northern', { flood: block({ band: 'extreme', advisories: [] }) })]),
      [],
    );
    expect(alerts.map((alert) => alert.hazardType)).not.toContain('Flood');
  });

  /* An undatable alert cannot be expired, and one that never expires is worse
     than none. */
  it('stays silent when the reading cannot be dated', () => {
    expect(synthesiseAlerts(summary([region('Northern')], { computedAt: null }), [])).toHaveLength(0);
  });

  it('expires a computed reading a fixed window after the snapshot', () => {
    const [alert] = synthesiseAlerts(summary([region('Northern')]), []);
    const minutes = (new Date(alert.expiresAt).getTime() - new Date(alert.issuedAt).getTime()) / 60_000;
    expect(minutes).toBe(HAZARD_ALERT_VALIDITY_MINUTES);
  });

  /* A forecaster's warning period is the forecaster's to set. Applying the
     computed reading's ten-minute window to a published bulletin would be the
     app second-guessing a human alerting authority, which is the one thing
     `provenance` exists to prevent. */
  it('leaves a bulletin standing for exactly as long as it says', () => {
    const [alert] = synthesiseAlerts(
      summary([
        region('Northern', {
          flood: block({
            band: 'extreme',
            overridden: true,
            headline: 'Bagre spillage under way',
            issuedBy: 'Ghana Meteorological Agency (GMet)',
            issuedAt: '2026-08-19T12:00:00.000Z',
            effectiveTo: '2026-08-19T18:00:00.000Z',
          }),
        }),
      ]),
      [],
    );
    const hours = (new Date(alert.expiresAt).getTime() - new Date(alert.issuedAt).getTime()) / 3600_000;
    expect(hours).toBe(6);
  });

  it('gives an open-ended bulletin a day, not ten minutes', () => {
    // `effective_to` is nullable. A forecaster who declined to set an end did
    // not mean "ten minutes".
    const [alert] = synthesiseAlerts(
      summary([
        region('Northern', {
          flood: block({
            band: 'extreme',
            overridden: true,
            headline: 'Bagre spillage under way',
            issuedBy: 'Ghana Meteorological Agency (GMet)',
            issuedAt: '2026-08-19T12:00:00.000Z',
            effectiveTo: null,
          }),
        }),
      ]),
      [],
    );
    const hours = (new Date(alert.expiresAt).getTime() - new Date(alert.issuedAt).getTime()) / 3600_000;
    expect(hours).toBe(BULLETIN_FALLBACK_VALIDITY_HOURS);
  });

  /* Ids must survive a change of conditions, or deep links and saved reminders
     break the moment the band moves. */
  it('keeps the id stable across bands and snapshots', () => {
    const a = synthesiseAlerts(summary([region('Upper East', { flood: block({ band: 'severe' }) })]), [])[0];
    const b = synthesiseAlerts(
      summary([region('Upper East', { flood: block({ band: 'extreme' }) })], { computedAt: '2026-09-01T06:00:00.000Z' }),
      [],
    )[0];
    expect(a.id).toBe(b.id);
    expect(a.id).toBe(hazardAlertId('Upper East', 'flood'));
  });

  describe('provenance', () => {
    it('attributes a computed reading to the model, never to GMet', () => {
      const [alert] = synthesiseAlerts(summary([region('Northern')]), []);
      expect(alert.source).toContain('AgroMet hazard model');
      expect(alert.source).not.toContain('GMet');
    });

    it('uses a published bulletin verbatim and credits its issuer', () => {
      const [alert] = synthesiseAlerts(
        summary([
          region('Northern', {
            flood: block({
              band: 'extreme',
              overridden: true,
              headline: 'Bagre spillage under way',
              issuedBy: 'Ghana Meteorological Agency (GMet)',
              issuedAt: '2026-08-19T12:00:00.000Z',
              effectiveTo: '2026-08-24T00:00:00.000Z',
            }),
          }),
        ]),
        [],
      );
      expect(alert.headline).toBe('Bagre spillage under way');
      expect(alert.source).toBe('Ghana Meteorological Agency (GMet)');
      expect(alert.issuedAt).toBe('2026-08-19T12:00:00.000Z');
      expect(alert.expiresAt).toBe('2026-08-24T00:00:00.000Z');
    });
  });

  describe('evidence', () => {
    /* The field must carry measurements, not invented consequences — and must
       skip drivers with no value rather than printing "null mm". */
    it('lists the measurements behind the score and skips empty ones', () => {
      const [alert] = synthesiseAlerts(summary([region('Northern')]), []);
      expect(alert.evidence).toHaveLength(1);
      expect(alert.evidence[0]).toContain('River discharge');
      expect(alert.evidence[0]).toContain('89%');
      expect(alert.evidence.join(' ')).not.toContain('null');
    });

    /* The gloss is the sentence the backend wrote for this purpose and it already
       carries the figure. Prefixing the raw value stated the number twice,
       rounded differently each time — "Heaviest forecast day: 26.9 mm — 27 mm in
       a day" — which reads as two measurements of the same thing. */
    it('states each figure once, in the words the backend wrote', () => {
      const [alert] = synthesiseAlerts(
        summary([
          region('Northern', {
            flood: block({
              drivers: [
                {
                  key: 'rainMax1d',
                  label: 'Heaviest forecast day',
                  value: 26.9,
                  unit: 'mm',
                  score: 80,
                  weight: 0.3,
                  percentile: 92,
                  gloss: '27 mm in a day, against 17 mm for a heavy day here at this time of year',
                },
              ],
            }),
          }),
        ]),
        [],
      );
      expect(alert.evidence[0]).toBe(
        'Heaviest forecast day: 27 mm in a day, against 17 mm for a heavy day here at this time of year',
      );
      expect(alert.evidence[0]).not.toContain('26.9');
    });

    it('formats the measurement itself when there is no gloss to use', () => {
      const [alert] = synthesiseAlerts(
        summary([
          region('Northern', {
            flood: block({
              drivers: [
                { key: 'discharge', label: 'River discharge', value: 6667.07, unit: 'm3/s', score: 80, weight: 0.4, percentile: 94, gloss: '' },
                { key: 'saturation', label: 'Soil saturation', value: 0.96, unit: 'fraction', score: 70, weight: 0.2, percentile: 96, gloss: '' },
                { key: 'spi90', label: 'Rainfall anomaly (SPI-90)', value: 1.32, unit: 'sigma', score: 60, weight: 0.2, percentile: 80, gloss: '' },
              ],
            }),
          }),
        ]),
        [],
      );
      // Never the payload's own spelling: not "m3/s", not "0.96 fraction", not a
      // bare "sigma".
      expect(alert.evidence).toEqual([
        'River discharge: 6667 m³/s',
        'Soil saturation: 96%',
        'Rainfall anomaly (SPI-90): 1.32',
      ]);
    });

    it('carries the backend advisories through as the actions', () => {
      const [alert] = synthesiseAlerts(summary([region('Northern')]), []);
      expect(alert.farmerActions).toEqual(['Move livestock to higher ground now.']);
    });
  });

  describe('district scoping', () => {
    it('covers every region when nothing is saved', () => {
      const alerts = synthesiseAlerts(summary([region('Northern'), region('Upper East')]), []);
      expect(alerts.map((alert) => alert.region).sort()).toEqual(['Northern', 'Upper East']);
    });

    it('limits alerts to the regions of the saved districts', () => {
      const alerts = synthesiseAlerts(
        summary([region('Northern'), region('Upper East')]),
        ['bolgatanga-municipal'],
      );
      expect(alerts).toHaveLength(1);
      expect(alerts[0].region).toBe('Upper East');
    });

    it('names a district only when one saved district identifies it', () => {
      const one = synthesiseAlerts(summary([region('Upper East')]), ['bolgatanga-municipal']);
      expect(one[0].district).toBe('Bolgatanga Municipal');

      /* Two saved districts in one region: the reading is regional, so naming
         either would be a false precision. */
      const two = synthesiseAlerts(summary([region('Northern')]), ['tamale-metropolitan', 'yendi-municipal']);
      expect(two[0].district).toBeUndefined();
    });

    it('ignores unknown district ids', () => {
      expect(synthesiseAlerts(summary([region('Northern')]), ['not-a-district'])).toHaveLength(0);
    });
  });

  it('sorts the most severe first', () => {
    const alerts = synthesiseAlerts(
      summary([
        region('Northern', { flood: block({ band: 'moderate' }) }),
        region('Upper East', { flood: block({ band: 'extreme' }) }),
      ]),
      [],
    );
    expect(alerts.map((alert) => alert.region)).toEqual(['Upper East', 'Northern']);
  });

  it('returns nothing when there is no summary at all', () => {
    expect(synthesiseAlerts(undefined, [])).toEqual([]);
  });

  /* CAP's urgency, certainty and sender — the fields that tell a farmer whether
     to act now and how much to trust it. Every one has to come from data that
     already arrives; the moment one is invented, a model index starts reading
     like a forecaster's bulletin. */
  describe('CAP fields', () => {
    it('marks only an extreme reading immediate', () => {
      const severe = synthesiseAlerts(summary([region('Northern', { flood: block({ band: 'severe' }) })]), [])[0];
      const extreme = synthesiseAlerts(
        summary([region('Northern', { flood: block({ band: 'extreme', score: 90 }) })]),
        [],
      )[0];
      expect(severe.urgency).toBe('expected');
      expect(extreme.urgency).toBe('immediate');
    });

    it('calls a score in the lower half of its band only possible', () => {
      // Band severe starts at 65; 70 is five points in, one revision away from
      // dropping out of the band altogether.
      const [alert] = synthesiseAlerts(summary([region('Northern', { flood: block({ score: 70 }) })]), []);
      expect(alert.certainty).toBe('possible');
    });

    it('needs a second agreeing driver before it will say likely', () => {
      // Deep in the band (80 >= 65 + 10) but carried by one measurement. A
      // single-source reading is exactly what CAP's `possible` is for.
      const [alone] = synthesiseAlerts(summary([region('Northern', { flood: block({ score: 80 }) })]), []);
      expect(alone.certainty).toBe('possible');

      const [agreed] = synthesiseAlerts(
        summary([
          region('Northern', {
            flood: block({
              score: 80,
              drivers: [
                { key: 'discharge', label: 'River discharge', value: 5127.6, unit: 'm3/s', score: 80, weight: 0.4, percentile: 89, gloss: '' },
                { key: 'rain7d', label: '7-day rainfall', value: 210, unit: 'mm', score: 72, weight: 0.3, percentile: 94, gloss: '' },
              ],
            }),
          }),
        ]),
        [],
      );
      expect(agreed.certainty).toBe('likely');
    });

    it('does not count a driver that measured nothing', () => {
      // Value null is how the backend reports a feed that returned no data.
      // Counting it as agreement would manufacture confidence.
      const [alert] = synthesiseAlerts(
        summary([
          region('Northern', {
            flood: block({
              score: 80,
              drivers: [
                { key: 'discharge', label: 'River discharge', value: 5127.6, unit: 'm3/s', score: 80, weight: 0.4, percentile: 89, gloss: '' },
                { key: 'rain7d', label: '7-day rainfall', value: null, unit: 'mm', score: 90, weight: 0.3, percentile: null, gloss: '' },
              ],
            }),
          }),
        ]),
        [],
      );
      expect(alert.certainty).toBe('possible');
    });

    it('gives a bulletin no certainty at all, because nothing publishes one', () => {
      const [alert] = synthesiseAlerts(
        summary([
          region('Northern', {
            flood: block({
              band: 'extreme',
              score: 95,
              overridden: true,
              headline: 'Bagre spillage under way',
              issuedBy: 'Ghana Meteorological Agency (GMet)',
              issuedAt: '2026-08-19T12:00:00.000Z',
            }),
          }),
        ]),
        [],
      );
      expect(alert.provenance).toBe('issued');
      expect(alert.certainty).toBeUndefined();
    });

    it('marks a model reading computed and links the data behind it', () => {
      const [alert] = synthesiseAlerts(summary([region('Northern')]), []);
      expect(alert.provenance).toBe('computed');
      expect(alert.sourceUrl).toBeUndefined();

      const [linked] = synthesiseAlerts(
        summary([region('Northern')], {
          sources: [{ id: 'open-meteo', label: 'Open-Meteo', url: 'https://open-meteo.com/' }],
        }),
        [],
      );
      expect(linked.sourceUrl).toBe('https://open-meteo.com/');
    });

    it('never points a bulletin at a dataset that did not issue it', () => {
      const [alert] = synthesiseAlerts(
        summary(
          [
            region('Northern', {
              flood: block({
                overridden: true,
                headline: 'Bagre spillage under way',
                issuedBy: 'Ghana Meteorological Agency (GMet)',
                issuedAt: '2026-08-19T12:00:00.000Z',
              }),
            }),
          ],
          { sources: [{ id: 'open-meteo', label: 'Open-Meteo', url: 'https://open-meteo.com/' }] },
        ),
        [],
      );
      expect(alert.sourceUrl).toBeUndefined();
    });

    it('reads out as one line a farmer can parse', () => {
      const [computed] = synthesiseAlerts(summary([region('Northern')]), []);
      expect(alertProvenanceLine(computed)).toBe('Expected · possible · AgroMet hazard model');

      const [issued] = synthesiseAlerts(
        summary([
          region('Northern', {
            flood: block({
              band: 'extreme',
              overridden: true,
              headline: 'Bagre spillage under way',
              issuedBy: 'Ghana Meteorological Agency (GMet)',
              issuedAt: '2026-08-19T12:00:00.000Z',
            }),
          }),
        ]),
        [],
      );
      expect(alertProvenanceLine(issued)).toBe('Happening now · Ghana Meteorological Agency (GMet)');
    });
  });
});

/* The gate between "this is an alert" and "this interrupts someone who opened
   the app for the weather". Tabled in full, because the two questions are easy
   to conflate and the whole point is that they are different. */
describe('reachesBanner', () => {
  function alert(overrides: Partial<WeatherAlert> = {}): WeatherAlert {
    return {
      id: 'hazard:northern:flood',
      headline: 'Severe flood risk in Northern',
      region: 'Northern',
      hazardType: 'Flood',
      severity: 'warning',
      issuedAt: COMPUTED_AT,
      expiresAt: '2026-08-21T06:00:00.000Z',
      urgency: 'expected',
      certainty: 'possible',
      provenance: 'computed',
      evidence: [],
      farmerActions: ['Move livestock to higher ground now.'],
      source: 'AgroMet hazard model (Open-Meteo)',
      ...overrides,
    };
  }

  const CASES: [AlertSeverity, 'possible' | 'likely', boolean][] = [
    ['watch', 'possible', false],
    ['watch', 'likely', false],
    ['warning', 'possible', true],
    ['warning', 'likely', true],
    ['emergency', 'possible', true],
    ['emergency', 'likely', true],
  ];

  it.each(CASES)('a computed %s that is %s reaches the banner: %s', (severity, certainty, expected) => {
    expect(reachesBanner(alert({ severity, certainty }))).toBe(expected);
  });

  /* Certainty does not discriminate above, and that is the deliberate part: a
     severe reading is worth attention even when the model will only say
     `possible`. It changes the wording, not whether the banner appears. */
  it('holds back a computed watch, which is an ordinary rainy-season state', () => {
    expect(reachesBanner(alert({ severity: 'watch' }))).toBe(false);
  });

  it('always shows an issued bulletin, however mild', () => {
    // A human alerting authority decided it mattered. The app does not
    // second-guess that — this is the one place provenance changes behaviour
    // rather than presentation.
    expect(reachesBanner(alert({ severity: 'watch', provenance: 'issued', certainty: undefined }))).toBe(true);
  });
});
