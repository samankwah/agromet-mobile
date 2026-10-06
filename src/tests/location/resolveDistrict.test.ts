import { getDistrictById } from '../../shared/data/districts';
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

  /* The old resolver gave every fix the district of its nearest town, so all
     of central Accra was "Accra Metropolitan". The district now comes from the
     polygon the fix is in; the town is still the nearest, for the weather. */
  it("takes the district the fix is in, not the nearest town's", () => {
    expect(resolveDistrictFromCoords(5.6, -0.19)).toEqual({
      townId: 'accra',
      districtId: 'ayawaso-east-municipal',
    });
  });

  it('still places a fix just off the coast', () => {
    // In the sea a few hundred metres off Cape Coast, outside every polygon.
    const offshore = resolveDistrictFromCoords(5.05, -1.35);
    expect(offshore?.townId).toBe('cape-coast');
    expect(getDistrictById(offshore?.districtId ?? '')?.region).toBe('Central');
  });

  it('returns null for a fix well outside the served area', () => {
    expect(resolveDistrictFromCoords(6.5244, 3.3792)).toBeNull(); // Lagos
    expect(resolveDistrictFromCoords(0, 0)).toBeNull(); // Gulf of Guinea
    expect(resolveDistrictFromCoords(37.42, -122.08)).toBeNull(); // emulator default
  });
});
