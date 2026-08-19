import { formatConfidenceRange } from '../../shared/utils/formatConfidenceRange';

describe('formatConfidenceRange', () => {
  it('renders the band label and both range bounds', () => {
    expect(formatConfidenceRange('moderate', [55, 70])).toBe('Moderate confidence (55–70%)');
  });

  it('never collapses to a single point value regardless of band', () => {
    expect(formatConfidenceRange('low', [20, 40])).toContain('–');
    expect(formatConfidenceRange('high', [80, 95])).toContain('–');
  });
});
