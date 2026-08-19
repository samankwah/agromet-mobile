import { formatTemperature } from '../../shared/utils/formatTemperature';

describe('formatTemperature', () => {
  it('rounds to the nearest whole degree and appends °C', () => {
    expect(formatTemperature(29.4)).toBe('29°C');
    expect(formatTemperature(29.5)).toBe('30°C');
  });

  it('formats negative values correctly', () => {
    expect(formatTemperature(-2.6)).toBe('-3°C');
  });

  it('formats zero without a sign', () => {
    expect(formatTemperature(0)).toBe('0°C');
  });

  it('falls back to an em dash for non-finite input', () => {
    expect(formatTemperature(NaN)).toBe('—');
    expect(formatTemperature(Infinity)).toBe('—');
  });
});
