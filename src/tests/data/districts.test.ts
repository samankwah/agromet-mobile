import { DISTRICTS, LEGACY_DISTRICT_IDS, getDistrictById, getDistrictNameForLocation } from '../../shared/data/districts';
import { GHANA_BOUNDARIES } from '../../shared/data/ghanaBoundaries';
import { HOME_LOCATIONS } from '../../shared/data/mockWeather';

/**
 * The invariant that matters here is coverage, not any particular pairing:
 * advisories and alerts are district-scoped, so a Home town with no district
 * silently shows a farmer nothing. That is a failure with no symptom, which is
 * exactly the kind worth a test.
 */
describe('getDistrictNameForLocation', () => {
  it('resolves a district for every home town', () => {
    const unmapped = HOME_LOCATIONS.filter((location) => !getDistrictNameForLocation(location.id));
    expect(unmapped.map((location) => location.id)).toEqual([]);
  });

  it('puts each town in a district of its own region', () => {
    // A town mapped to a district in the wrong region would still resolve, and
    // would then inherit the wrong region's flood and drought reading.
    const byId = new Map(DISTRICTS.map((district) => [district.name, district.region]));
    for (const location of HOME_LOCATIONS) {
      const districtName = getDistrictNameForLocation(location.id);
      expect(byId.get(districtName as string)).toBe(location.region);
    }
  });

  it('maps damongo to West Gonja, the district the Savannah drought mock alert targets', () => {
    expect(getDistrictNameForLocation('damongo')).toBe('West Gonja Municipal');
  });

  it('returns undefined for an unknown location id', () => {
    expect(getDistrictNameForLocation('not-a-real-town')).toBeUndefined();
  });
});

describe('HOME_LOCATIONS', () => {
  it('carries the thirty-two towns the carousel offers, with no duplicates', () => {
    expect(HOME_LOCATIONS).toHaveLength(32);
    expect(new Set(HOME_LOCATIONS.map((location) => location.id)).size).toBe(32);
  });

  it('sits every town inside Ghana', () => {
    // Ghana spans roughly 4.5-11.2°N and 3.3°W-1.2°E. A transposed or
    // sign-flipped coordinate would otherwise fetch weather for the Gulf of
    // Guinea and look entirely plausible on the card.
    for (const location of HOME_LOCATIONS) {
      expect(location.lat).toBeGreaterThan(4.5);
      expect(location.lat).toBeLessThan(11.2);
      expect(location.lng).toBeGreaterThan(-3.3);
      expect(location.lng).toBeLessThan(1.3);
    }
  });

  it('reaches all sixteen regions, so no region is unreachable from Home', () => {
    const regions = new Set(HOME_LOCATIONS.map((location) => location.region));
    expect(regions.size).toBe(16);
  });

  /* Yendi stayed in Northern Region when North East was carved out of it in
     2018; North East's capital is Nalerigu. The old list had Yendi as North
     East, which was harmless as a label and is not harmless now that `region`
     decides which hazard reading a town inherits. */
  it('puts Yendi in Northern and Nalerigu in North East', () => {
    const region = (id: string) => HOME_LOCATIONS.find((location) => location.id === id)?.region;
    expect(region('yendi')).toBe('Northern');
    expect(region('nalerigu')).toBe('North East');
  });
});

describe('DISTRICTS', () => {
  it('lists every district in Ghana once', () => {
    expect(DISTRICTS).toHaveLength(261);
    expect(new Set(DISTRICTS.map((district) => district.id)).size).toBe(261);
  });

  /* The map polygon and the alert list must agree on ids, or a GPS fix
     resolves to a district the alert pipeline cannot find. */
  it('has an entry for every district polygon on the map, in the same region', () => {
    for (const { properties } of GHANA_BOUNDARIES.districts) {
      expect(getDistrictById(properties.id)).toEqual({ id: properties.id, name: properties.name, region: properties.region });
    }
  });

  it('lists Guan, the one district the shapefile has no polygon for', () => {
    const shaped = new Set(GHANA_BOUNDARIES.districts.map((feature) => feature.properties.id));
    expect(DISTRICTS.filter((district) => !shaped.has(district.id)).map((district) => district.name)).toEqual(['Guan']);
  });

  /* Alert districts saved before the full list are stored under the old ids. */
  it('still finds a district saved under an id from the old list', () => {
    for (const [oldId, newId] of Object.entries(LEGACY_DISTRICT_IDS)) {
      expect(getDistrictById(oldId)?.id).toBe(newId);
    }
    expect(getDistrictById('ketu-south')?.name).toBe('Ketu South Municipal');
  });
});
