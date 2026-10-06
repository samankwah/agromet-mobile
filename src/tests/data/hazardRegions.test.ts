import { DISTRICTS } from '../../shared/data/districts';
import { GHANA_BOUNDARIES } from '../../shared/data/ghanaBoundaries';

/**
 * The hazard feature joins three independently-maintained sources on a bare
 * region string: the backend's payload, the boundary asset the map draws, and
 * the district list alerts are targeted by. Nothing enforces that at runtime —
 * a mismatch shows up as a region silently missing from the map, or a farmer
 * who never receives an alert.
 *
 * These pin the contract, so a regenerated boundary file or a renamed district
 * fails here instead of in someone's hands.
 */

/** Exactly what `GHANA_REGIONS` in backend/app/hazards.py publishes. Note the
 * absence of a " Region" suffix — `ghanaRegions.ts` carries one and must never
 * be used to address this API. */
const BACKEND_REGIONS = [
  'Ahafo',
  'Ashanti',
  'Bono',
  'Bono East',
  'Central',
  'Eastern',
  'Greater Accra',
  'North East',
  'Northern',
  'Oti',
  'Savannah',
  'Upper East',
  'Upper West',
  'Volta',
  'Western',
  'Western North',
];

describe('the map join', () => {
  it('covers all sixteen backend regions and invents none', () => {
    const names = new Set(GHANA_BOUNDARIES.regions.map((feature) => feature.properties.name));
    expect([...names].sort()).toEqual(BACKEND_REGIONS);
  });

  /* The old asset dissolved regions from districts simplified one by one,
     which left 26 fragments (Greater Accra alone was six) and slivers. The
     topology-aware build gives one solid shape per region. */
  it('draws each region as one solid shape', () => {
    expect(GHANA_BOUNDARIES.regions).toHaveLength(BACKEND_REGIONS.length);
    for (const region of GHANA_BOUNDARIES.regions) {
      expect(region.geometry.type).toBe('Polygon');
      expect(region.geometry.coordinates).toHaveLength(1); // no holes
    }
  });
});

describe('alert targeting', () => {
  it('uses region names the hazards API accepts', () => {
    for (const district of DISTRICTS) {
      expect(BACKEND_REGIONS).toContain(district.region);
    }
  });

  /* Readings are published for all sixteen regions. A region with no
     selectable district can never raise an alert for anyone, however severe
     it gets. */
  it('offers at least one district in every region', () => {
    const covered = new Set(DISTRICTS.map((district) => district.region));
    expect([...covered].sort()).toEqual(BACKEND_REGIONS);
  });

  it('keeps district ids unique', () => {
    const ids = DISTRICTS.map((district) => district.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
