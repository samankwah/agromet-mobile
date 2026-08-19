import { getDistrictNameForLocation } from '../../shared/data/districts';
import { HOME_LOCATIONS } from '../../shared/data/mockWeather';

describe('getDistrictNameForLocation', () => {
  it('resolves a district for every one of the 10 home towns', () => {
    for (const location of HOME_LOCATIONS) {
      expect(getDistrictNameForLocation(location.id)).toBeDefined();
    }
  });

  it('maps damongo to West Gonja — the district the Savannah drought mock alert targets', () => {
    expect(getDistrictNameForLocation('damongo')).toBe('West Gonja (Damongo)');
  });

  it('returns undefined for an unknown location id', () => {
    expect(getDistrictNameForLocation('not-a-real-town')).toBeUndefined();
  });

  it('no longer maps obuasi to a town (dropped from HOME_LOCATIONS)', () => {
    expect(HOME_LOCATIONS.some((location) => location.id === 'obuasi')).toBe(false);
    expect(getDistrictNameForLocation('obuasi')).toBeUndefined();
  });
});
