import { MOCK_CALENDARS, MOCK_CALENDAR_ACTIVITIES } from '../../shared/data/mockCalendars';
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

describe('sample crop calendars', () => {
  it('files every sample calendar under a district that exists', () => {
    // A calendar filed under a district the catalogue does not list can
    // never be reached through the filters.
    for (const entry of MOCK_CALENDARS) {
      expect(GHANA_REGION_NAMES).toContain(entry.region);
      expect(districtsInRegion(entry.region)).toContain(entry.district);
    }
  });

  it('covers the five crops in use', () => {
    const crops = MOCK_CALENDARS.filter((c) => c.calendarType === 'seasonal').map((c) => c.crop);
    expect(crops.sort()).toEqual(['Maize', 'Rice', 'Sorghum', 'Soybean', 'Tomato']);
  });

  it('keeps the maize schedule as transcribed, including its two harvest rows', () => {
    const maize = MOCK_CALENDAR_ACTIVITIES['sample-maize-ejura'];
    expect(maize).toHaveLength(10);

    // The published calendar genuinely lists Harvesting twice, in
    // consecutive blocks. Collapsing them would misreport the schedule.
    const harvests = maize.filter((a) => a.activityName === 'Harvesting');
    expect(harvests.map((a) => [a.startWeek, a.endWeek])).toEqual([
      [27, 29],
      [30, 31],
    ]);
    expect(new Set(maize.map((a) => a.id)).size).toBe(maize.length);
  });

  it('anchors the crop calendars so the grid can show months and dates', () => {
    // Without a start month and year the grid can only label week blocks —
    // the printed calendars show January..September and day ranges.
    for (const entry of MOCK_CALENDARS.filter((c) => c.calendarType === 'seasonal' && c.id !== 'sample-tomato-adansi-north')) {
      expect(entry.seasonStartMonth).toBeTruthy();
      expect(entry.year).toBeTruthy();
    }
  });

  it('keeps every activity inside its calendar length', () => {
    for (const entry of MOCK_CALENDARS) {
      for (const a of MOCK_CALENDAR_ACTIVITIES[entry.id] ?? []) {
        expect(a.startWeek).toBeGreaterThanOrEqual(1);
        expect(a.endWeek ?? a.startWeek).toBeLessThanOrEqual(entry.totalWeeks);
      }
    }
  });
});
