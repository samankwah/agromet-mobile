import type { HazardBlock, HazardRegion, HazardSummary } from '../../shared/domain/hazard';
import {
  HAZARD_ALERT_VALIDITY_HOURS,
  hazardAlertId,
  synthesiseAlerts,
} from '../../shared/domain/hazardAlerts';

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
    const hours = (new Date(alert.expiresAt).getTime() - new Date(alert.issuedAt).getTime()) / 3600_000;
    expect(hours).toBe(HAZARD_ALERT_VALIDITY_HOURS);
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
});
