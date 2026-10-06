import { districtAt } from '../../shared/location/districtAt';

/**
 * GPS detection reads the district polygon a fix falls in. The towns below are
 * district capitals, so each must land in its own district and region.
 */
describe('districtAt', () => {
  it.each([
    ['Accra', 5.55, -0.205, 'Accra Metropolitan', 'Greater Accra'],
    ['Kumasi', 6.693, -1.624, 'Kumasi Metropolitan', 'Ashanti'],
    ['Tamale', 9.403, -0.842, 'Tamale Metropolitan', 'Northern'],
    ['Ho', 6.601, 0.471, 'Ho Municipal', 'Volta'],
    ['Wa', 10.0601, -2.5099, 'Wa Municipal', 'Upper West'],
    ['Damongo', 9.0842, -1.815, 'West Gonja Municipal', 'Savannah'],
    ['Fomena', 6.268, -1.498, 'Adansi North', 'Ashanti'],
  ])('puts %s in its own district', (_town, lat, lng, name, region) => {
    expect(districtAt(lat, lng)).toMatchObject({ name, region });
  });

  it('tells neighbouring city districts apart', () => {
    expect(districtAt(5.6, -0.19)?.name).toBe('Ayawaso East Municipal');
    expect(districtAt(5.55, -0.205)?.name).toBe('Accra Metropolitan');
  });

  it('places a fix just off the coast on the nearest district', () => {
    expect(districtAt(5.05, -1.35)?.region).toBe('Central');
  });

  it('places nothing outside Ghana', () => {
    expect(districtAt(6.5244, 3.3792)).toBeNull(); // Lagos
    expect(districtAt(5.35, -4.0)).toBeNull(); // Abidjan
    expect(districtAt(0, 0)).toBeNull();
  });
});
