import { AGRO_ZONES, regionIsInZone, regionsInZone, zoneForRegion } from '../../shared/data/agroZones';
import { GHANA_REGION_NAMES } from '../../shared/data/ghanaRegions';

describe('agro-ecological zones', () => {
  /* Every name here has to match the region catalogue exactly, or narrowing by
     zone would silently offer nothing. */
  it('names only regions the catalogue knows', () => {
    for (const zone of AGRO_ZONES) {
      for (const region of regionsInZone(zone)) {
        expect(GHANA_REGION_NAMES).toContain(region);
      }
    }
  });

  it('covers every region in at least one zone', () => {
    for (const region of GHANA_REGION_NAMES) {
      expect(zoneForRegion(region)).not.toBe('');
    }
  });

  /* A zone is not a region and does not nest inside one — Upper East runs from
     Sudan into Guinea Savannah, and both listings are correct. */
  it('lets a region belong to more than one zone', () => {
    expect(regionsInZone('Sudan Savannah')).toContain('Upper East Region');
    expect(regionsInZone('Guinea Savannah')).toContain('Upper East Region');
  });

  it('offers every region when no zone is chosen', () => {
    expect(regionsInZone('')).toEqual(GHANA_REGION_NAMES);
  });

  it('keeps the catalogue order rather than the zone map order', () => {
    const forest = regionsInZone('Semi-Deciduous Forest');
    const positions = forest.map((region) => GHANA_REGION_NAMES.indexOf(region));

    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  describe('regionIsInZone', () => {
    it('is true whenever either side is unset', () => {
      expect(regionIsInZone('', 'Rain Forest')).toBe(true);
      expect(regionIsInZone('Ashanti Region', '')).toBe(true);
    });

    it('spots a region the chosen zone does not reach', () => {
      expect(regionIsInZone('Ashanti Region', 'Semi-Deciduous Forest')).toBe(true);
      expect(regionIsInZone('Ashanti Region', 'Sudan Savannah')).toBe(false);
    });
  });
});
