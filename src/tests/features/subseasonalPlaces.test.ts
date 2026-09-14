import { GHANA_BOUNDARIES } from '../../shared/data/ghanaBoundaries';
import { PLACES, searchPlaces } from '../../features/forecasts/subseasonal/places';

/**
 * The searchable index behind the map's place search.
 *
 * Built from the same pre-baked grid the map draws, so a search result and a
 * tap on the same district resolve to the same forecast cell.
 */
describe('PLACES', () => {
  it('covers every region and district the grid can place', () => {
    const regions = new Set(GHANA_BOUNDARIES.grid.map((cell) => cell.regionName).filter(Boolean));
    const districts = new Set(
      GHANA_BOUNDARIES.grid.filter((cell) => cell.regionName && cell.districtName).map((cell) => `${cell.regionName}:${cell.districtName}`),
    );

    expect(PLACES.filter((place) => place.kind === 'region')).toHaveLength(regions.size);
    expect(PLACES.filter((place) => place.kind === 'district')).toHaveLength(districts.size);
  });

  it('keys districts by region, because the names repeat across Ghana', () => {
    expect(new Set(PLACES.map((place) => place.id)).size).toBe(PLACES.length);
  });

  /* A polygon centroid can fall outside a concave district and fetch a
     neighbour's forecast. Averaging tagged grid cells cannot: every cell it
     averages is inside. */
  it('puts every place inside the country', () => {
    const { minLat, maxLat, minLng, maxLng } = GHANA_BOUNDARIES.bounds;

    for (const place of PLACES) {
      expect(place.lat).toBeGreaterThanOrEqual(minLat);
      expect(place.lat).toBeLessThanOrEqual(maxLat);
      expect(place.lng).toBeGreaterThanOrEqual(minLng);
      expect(place.lng).toBeLessThanOrEqual(maxLng);
    }
  });

  it('gives every district the region it belongs to', () => {
    expect(PLACES.filter((place) => place.kind === 'district').every((place) => place.region)).toBe(true);
  });
});

describe('searchPlaces', () => {
  it('waits for enough to go on rather than dumping the whole country', () => {
    expect(searchPlaces('')).toEqual([]);
    expect(searchPlaces('a')).toEqual([]);
  });

  it('ranks a prefix match above an interior one', () => {
    // "wa" matches Wassa East at the start and Tarkwa Nsuaem in the middle.
    // Typing the start of a name almost always means that name, so burying it
    // under alphabetical neighbours makes the box feel broken.
    const results = searchPlaces('wa');

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].name.toLowerCase().startsWith('wa')).toBe(true);
  });

  it('matches inside a name too, not only at the start', () => {
    // Greater Accra is the case that matters: a reader typing the city name
    // must still find the region, which does not begin with it.
    expect(searchPlaces('accra').map((place) => place.name)).toContain('Greater Accra');
    expect(searchPlaces('west').length).toBeGreaterThan(0);
  });

  it('ignores case and surrounding space', () => {
    expect(searchPlaces('  TAMALE ').map((place) => place.name)).toEqual(searchPlaces('tamale').map((place) => place.name));
  });

  it('caps the list, so the results never bury the map', () => {
    expect(searchPlaces('a', 5).length).toBeLessThanOrEqual(5);
    expect(searchPlaces('an').length).toBeLessThanOrEqual(8);
  });

  it('finds nothing for a place that is not in Ghana', () => {
    expect(searchPlaces('lagos')).toEqual([]);
  });
});
