import { resolveDistrictFromCoords } from '../../shared/location/resolveDistrict';

/**
 * The resolver turns a raw fix into the town/district the alert pipeline and
 * the Home weather both key off. What matters is that a fix anywhere in the
 * populated country lands on a real district, and a fix outside it lands on
 * nothing rather than the nearest coastal town.
 */
describe('resolveDistrictFromCoords', () => {
  it('places a fix on the town it is nearest to', () => {
    // Bolgatanga: 10.7856, -0.8514
    expect(resolveDistrictFromCoords(10.79, -0.85)).toEqual({
      townId: 'bolgatanga',
      districtId: 'bolgatanga-municipal',
    });
  });

  it('resolves a fix between two towns to the nearer one', () => {
    // Halfway up the coast road, closer to Cape Coast than to Takoradi.
    const near = resolveDistrictFromCoords(5.05, -1.35);
    expect(near).toEqual({ townId: 'cape-coast', districtId: 'cape-coast-metropolitan' });
  });

  it('covers Accra', () => {
    expect(resolveDistrictFromCoords(5.6, -0.19)).toEqual({
      townId: 'accra',
      districtId: 'accra-metropolitan',
    });
  });

  it('returns null for a fix well outside the served area', () => {
    expect(resolveDistrictFromCoords(6.5244, 3.3792)).toBeNull(); // Lagos
    expect(resolveDistrictFromCoords(0, 0)).toBeNull(); // Gulf of Guinea
    expect(resolveDistrictFromCoords(37.42, -122.08)).toBeNull(); // emulator default
  });
});
