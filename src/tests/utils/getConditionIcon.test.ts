import { getConditionIcon } from '../../shared/utils/getConditionIcon';

describe('getConditionIcon', () => {
  it('maps thunderstorm conditions', () => {
    expect(getConditionIcon('Thunderstorms likely')).toBe('thunderstorm-outline');
  });

  it('maps rain/shower/drizzle conditions to the same rainy icon', () => {
    expect(getConditionIcon('Heavy rain')).toBe('rainy-outline');
    expect(getConditionIcon('Scattered showers')).toBe('rainy-outline');
    expect(getConditionIcon('Light drizzle')).toBe('rainy-outline');
  });

  it('maps sunny/clear conditions', () => {
    expect(getConditionIcon('Sunny')).toBe('sunny-outline');
    expect(getConditionIcon('Sunny, dry')).toBe('sunny-outline');
  });

  it('maps overcast distinctly from partly cloudy', () => {
    expect(getConditionIcon('Overcast')).toBe('cloud-outline');
    expect(getConditionIcon('Partly cloudy')).toBe('partly-sunny-outline');
  });

  it('maps the after-dark conditions to moon icons', () => {
    expect(getConditionIcon('Clear night')).toBe('moon-outline');
    expect(getConditionIcon('Partly cloudy night')).toBe('cloudy-night-outline');
  });

  it('keeps rain and storms unchanged at night, since they look the same after dark', () => {
    // "night" must not outrank the weather itself — a farmer checking
    // whether it is raining at 2am is not helped by a moon.
    expect(getConditionIcon('Rain showers at night')).toBe('rainy-outline');
    expect(getConditionIcon('Thunderstorms overnight')).toBe('thunderstorm-outline');
  });

  it('is case-insensitive', () => {
    expect(getConditionIcon('SUNNY')).toBe('sunny-outline');
  });

  it('falls back to a neutral icon for an unrecognized condition', () => {
    expect(getConditionIcon('Foggy')).toBe('partly-sunny-outline');
  });
});
