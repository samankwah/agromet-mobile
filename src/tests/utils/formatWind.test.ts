import { formatWind } from '../../shared/utils/formatWind';

describe('formatWind', () => {
  it('rounds to the nearest whole km/h', () => {
    expect(formatWind(14.2)).toBe('14 km/h');
    expect(formatWind(14.5)).toBe('15 km/h');
  });

  it('falls back to an em dash for non-finite input', () => {
    expect(formatWind(NaN)).toBe('—');
  });
});
