import { ALERT_SEVERITY_ORDER, compareSeverityDesc, getSeverityMeta } from '../../shared/domain/alertSeverity';
import type { AlertSeverity } from '../../shared/domain/alertSeverity';

describe('getSeverityMeta', () => {
  it('maps normal to a calm, non-alarming label/icon/color', () => {
    const meta = getSeverityMeta('normal');
    expect(meta.label).toBe('Normal');
    expect(meta.colorToken).toBe('normal');
    expect(meta.icon).toBe('checkmark-circle');
  });

  it('maps watch to its own distinct label/icon/color', () => {
    const meta = getSeverityMeta('watch');
    expect(meta.label).toBe('Watch');
    expect(meta.colorToken).toBe('watch');
    expect(meta.icon).toBe('eye');
  });

  it('maps warning to its own distinct label/icon/color', () => {
    const meta = getSeverityMeta('warning');
    expect(meta.label).toBe('Warning');
    expect(meta.colorToken).toBe('warning');
    expect(meta.icon).toBe('warning');
  });

  it('maps emergency to its own distinct label/icon/color', () => {
    const meta = getSeverityMeta('emergency');
    expect(meta.label).toBe('Emergency');
    expect(meta.colorToken).toBe('emergency');
    expect(meta.icon).toBe('alert-circle');
  });

  it('gives every severity a screen-reader label distinct from its visible label', () => {
    for (const severity of ALERT_SEVERITY_ORDER) {
      const meta = getSeverityMeta(severity);
      expect(meta.a11yLabel.length).toBeGreaterThan(meta.label.length);
    }
  });

  it('throws for an unknown severity instead of silently rendering blank', () => {
    expect(() => getSeverityMeta('extreme' as AlertSeverity)).toThrow(/unknown severity/i);
  });
});

describe('compareSeverityDesc', () => {
  it('sorts emergency before warning before watch before normal', () => {
    const sorted = ([...ALERT_SEVERITY_ORDER] as AlertSeverity[]).sort((a, b) => compareSeverityDesc(a, b));
    expect(sorted).toEqual(['emergency', 'warning', 'watch', 'normal']);
  });

  it('treats equal severities as equal', () => {
    expect(compareSeverityDesc('warning', 'warning')).toBe(0);
  });
});
