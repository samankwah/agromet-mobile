import { districtsInRegion, GHANA_REGION_NAMES, GHANA_REGIONS } from '../../shared/data/ghanaRegions';

describe('Ghana region catalogue', () => {
  it('has the 16 regions that exist today, not the pre-2018 seventeen', () => {
    expect(GHANA_REGIONS).toHaveLength(16);

    // Brong Ahafo was abolished in the 2018 referendum and split into
    // Ahafo, Bono and Bono East. The web app's ghanaCodes.js still lists
    // it, which is why it reports 17 regions and duplicates 29 districts.
    expect(GHANA_REGION_NAMES).not.toContain('Brong Ahafo Region');
    expect(GHANA_REGION_NAMES).toEqual(expect.arrayContaining(['Ahafo Region', 'Bono Region', 'Bono East Region']));
  });

  it('carries the " Region" suffix the backend stores', () => {
    // The database holds "Ashanti Region", and /api/enhanced-calendars
    // matches the string exactly — "Ashanti" would find nothing.
    for (const name of GHANA_REGION_NAMES) {
      expect(name.endsWith(' Region')).toBe(true);
    }
  });

  it('lists each district exactly once, under one region', () => {
    const all = GHANA_REGIONS.flatMap((region) => region.districts);
    expect(new Set(all).size).toBe(all.length);
    expect(all.length).toBe(258);
  });

  it('contains the districts the app and its data actually reference', () => {
    // The live Tomato calendar is filed under Adansi North / Ashanti; the
    // sample poultry cycles under Accra Metropolitan / Greater Accra. If
    // these ever fall out of the catalogue the filters silently stop
    // finding real calendars.
    expect(districtsInRegion('Ashanti Region')).toContain('Adansi North');
    expect(districtsInRegion('Greater Accra Region')).toContain('Accra Metropolitan');
    expect(districtsInRegion('Northern Region')).toContain('Tamale Metropolitan');
  });

  it('gives every region at least one district, and sorts them', () => {
    for (const region of GHANA_REGIONS) {
      expect(region.districts.length).toBeGreaterThan(0);
      expect([...region.districts].sort((a, b) => a.localeCompare(b))).toEqual(region.districts);
    }
  });

  it('returns nothing for a region that does not exist, rather than throwing', () => {
    expect(districtsInRegion('Brong Ahafo Region')).toEqual([]);
    expect(districtsInRegion('')).toEqual([]);
  });
});
