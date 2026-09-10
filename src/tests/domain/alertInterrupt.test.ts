import type { AlertSeverity } from '../../shared/domain/alertSeverity';
import { interrupts, pickInterrupting, shouldInterrupt } from '../../shared/domain/alertInterrupt';
import { ALERT_LEAD_TIME_MINUTES, isCurrent } from '../../shared/domain/hazardAlerts';
import type { WeatherAlert } from '../../shared/domain/weatherAlert';

const NOW = Date.parse('2026-08-23T12:00:00.000Z');
const minutes = (n: number) => new Date(NOW + n * 60_000).toISOString();

function alert(overrides: Partial<WeatherAlert> = {}): WeatherAlert {
  return {
    id: 'hazard:eastern:flood',
    headline: 'Extreme flood risk in Eastern',
    region: 'Eastern',
    hazardType: 'Flood',
    severity: 'emergency',
    issuedAt: minutes(-60),
    expiresAt: minutes(60),
    urgency: 'immediate',
    certainty: 'possible',
    provenance: 'computed',
    evidence: [],
    farmerActions: ['Follow NADMO instructions for your district.'],
    source: 'AgroMet hazard model (Open-Meteo)',
    ...overrides,
  };
}

/* The half of the alert lifecycle that was missing entirely: `buildAlert`
   computed `expiresAt`, the details screen printed it, and nothing ever compared
   it to a clock. Offline that is where it hurt — `useCachedQuery` serves the last
   snapshot from disk, so a lapsed flood warning stayed on screen on exactly the
   connection where a farmer could not check it against anything else. */
describe('isCurrent', () => {
  it('shows an alert inside its window', () => {
    expect(isCurrent(alert(), NOW)).toBe(true);
  });

  it('drops an alert once it has expired', () => {
    expect(isCurrent(alert({ expiresAt: minutes(-1) }), NOW)).toBe(false);
  });

  it('treats the expiry moment itself as still current', () => {
    // A warning that lapses this second has not lapsed yet. Rounding the other
    // way would blink it off a second early for no benefit.
    expect(isCurrent(alert({ expiresAt: new Date(NOW).toISOString() }), NOW)).toBe(true);
  });

  describe('onset', () => {
    it('holds an alert back until its lead time opens', () => {
      const beforeLead = alert({ onset: minutes(ALERT_LEAD_TIME_MINUTES + 1), expiresAt: minutes(600) });
      expect(isCurrent(beforeLead, NOW)).toBe(false);
    });

    it('shows it once the lead time opens', () => {
      const atLead = alert({ onset: minutes(ALERT_LEAD_TIME_MINUTES), expiresAt: minutes(600) });
      expect(isCurrent(atLead, NOW)).toBe(true);
    });

    it('shows an alert whose onset has already passed', () => {
      expect(isCurrent(alert({ onset: minutes(-30) }), NOW)).toBe(true);
    });

    /* Nothing in the app populates `onset` today: the flood/drought index has
       no onset to give, and the backend only serves a bulletin once
       `effective_from` has passed. So a computed alert must not be held back by
       a rule that cannot apply to it. */
    it('never holds back an alert that has no onset', () => {
      expect(alert().onset).toBeUndefined();
      expect(isCurrent(alert(), NOW)).toBe(true);
    });
  });

  /* Hiding a warning because a timestamp failed to parse is the worse of the two
     failures. */
  it('shows an alert whose dates cannot be read', () => {
    expect(isCurrent(alert({ expiresAt: 'not a date', onset: 'also not a date' }), NOW)).toBe(true);
  });
});

describe('interrupts', () => {
  /* The popup has to be rarer than the banner or it becomes something people
     swipe away without reading. Today's live data has three regions at band
     extreme and two at severe — popping for both tiers would interrupt a farmer
     in Oti over a reading that has been steady for days. */
  const CASES: [AlertSeverity, WeatherAlert['provenance'], boolean][] = [
    ['watch', 'computed', false],
    ['warning', 'computed', false],
    ['emergency', 'computed', true],
    ['watch', 'issued', true],
    ['warning', 'issued', true],
    ['emergency', 'issued', true],
  ];

  it.each(CASES)('a %s alert that is %s interrupts: %s', (severity, provenance, expected) => {
    expect(interrupts(alert({ severity, provenance }))).toBe(expected);
  });
});

describe('shouldInterrupt', () => {
  it('interrupts the first time', () => {
    expect(shouldInterrupt(alert(), undefined)).toBe(true);
  });

  it('does not interrupt again for the same reading', () => {
    expect(shouldInterrupt(alert(), { severity: 'emergency', issuedAt: minutes(-60) })).toBe(false);
  });

  /* A computed reading's `issuedAt` is the model run time and moves every few
     hours. Keying on it would pop the same warning at every refresh, which is
     the failure this whole store exists to prevent. */
  it('does not interrupt again when only the model run time moved', () => {
    const refreshed = alert({ issuedAt: minutes(-5) });
    expect(shouldInterrupt(refreshed, { severity: 'emergency', issuedAt: minutes(-60) })).toBe(false);
  });

  it('interrupts again when the severity is upgraded', () => {
    // Warning to emergency is a different instruction, so it earns the screen a
    // second time.
    expect(shouldInterrupt(alert({ severity: 'emergency' }), { severity: 'warning', issuedAt: minutes(-60) })).toBe(
      true,
    );
  });

  it('stays quiet when conditions ease', () => {
    // Being told it is less bad than it was is not worth taking over the screen.
    const eased = alert({ severity: 'warning', provenance: 'issued' });
    expect(shouldInterrupt(eased, { severity: 'emergency', issuedAt: eased.issuedAt })).toBe(false);
  });

  it('interrupts again when a forecaster re-issues', () => {
    // A human publishing a second time is a deliberate new message, unlike a
    // model re-running.
    const reissued = alert({ provenance: 'issued', severity: 'warning', issuedAt: minutes(-2) });
    expect(shouldInterrupt(reissued, { severity: 'warning', issuedAt: minutes(-600) })).toBe(true);
  });
});

describe('pickInterrupting', () => {
  it('takes the worst unacknowledged alert', () => {
    // `synthesiseAlerts` already returns worst-first, so the first qualifying
    // entry is the right one.
    const alerts = [
      alert({ id: 'hazard:volta:flood', severity: 'emergency' }),
      alert({ id: 'hazard:oti:flood', severity: 'emergency' }),
    ];
    expect(pickInterrupting(alerts, {})?.id).toBe('hazard:volta:flood');
  });

  it('skips the ones already seen and takes the next', () => {
    const alerts = [
      alert({ id: 'hazard:volta:flood' }),
      alert({ id: 'hazard:eastern:flood' }),
    ];
    const seen = { 'hazard:volta:flood': { severity: 'emergency' as AlertSeverity, issuedAt: alerts[0].issuedAt } };
    expect(pickInterrupting(alerts, seen)?.id).toBe('hazard:eastern:flood');
  });

  it('returns nothing when everything has been seen', () => {
    const one = alert();
    expect(pickInterrupting([one], { [one.id]: { severity: one.severity, issuedAt: one.issuedAt } })).toBeUndefined();
  });

  it('returns nothing when nothing is loud enough', () => {
    expect(pickInterrupting([alert({ severity: 'warning', provenance: 'computed' })], {})).toBeUndefined();
  });
});
