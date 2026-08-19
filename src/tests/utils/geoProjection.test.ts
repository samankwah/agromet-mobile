import { createProjector, polygonToSvgPath } from '../../shared/utils/geoProjection';

const BOUNDS = { minLng: -3, minLat: 4.5, maxLng: 1.5, maxLat: 11.5 };
const VIEWPORT = { width: 300, height: 400, padding: 10 };

describe('createProjector', () => {
  it('projects the bounds corners within the viewport (respecting padding)', () => {
    const project = createProjector(BOUNDS, VIEWPORT);
    const corner = project(BOUNDS.minLng, BOUNDS.maxLat); // top-left geographically
    expect(corner.x).toBeGreaterThanOrEqual(0);
    expect(corner.y).toBeGreaterThanOrEqual(0);
    expect(corner.x).toBeLessThanOrEqual(VIEWPORT.width);
    expect(corner.y).toBeLessThanOrEqual(VIEWPORT.height);
  });

  it('increasing latitude moves the point up the screen (smaller y)', () => {
    const project = createProjector(BOUNDS, VIEWPORT);
    const south = project(-1, 5);
    const north = project(-1, 10);
    expect(north.y).toBeLessThan(south.y);
  });

  it('increasing longitude moves the point right (larger x)', () => {
    const project = createProjector(BOUNDS, VIEWPORT);
    const west = project(-2.5, 8);
    const east = project(1, 8);
    expect(east.x).toBeGreaterThan(west.x);
  });

  it('does not throw on a degenerate (zero-span) bounds box', () => {
    const project = createProjector({ minLng: 0, minLat: 0, maxLng: 0, maxLat: 0 }, VIEWPORT);
    expect(() => project(0, 0)).not.toThrow();
  });
});

describe('polygonToSvgPath', () => {
  const project = createProjector(BOUNDS, VIEWPORT);

  it('produces a closed path (M...Z) for a simple Polygon', () => {
    const geometry = {
      type: 'Polygon' as const,
      coordinates: [
        [
          [-2, 5],
          [-1, 5],
          [-1, 6],
          [-2, 6],
          [-2, 5],
        ],
      ],
    };
    const path = polygonToSvgPath(geometry, project);
    expect(path.startsWith('M')).toBe(true);
    expect(path.trim().endsWith('Z')).toBe(true);
  });

  it('produces one closed sub-path per polygon for a MultiPolygon', () => {
    const geometry = {
      type: 'MultiPolygon' as const,
      coordinates: [
        [
          [
            [-2, 5],
            [-1, 5],
            [-1, 6],
            [-2, 6],
            [-2, 5],
          ],
        ],
        [
          [
            [0, 9],
            [1, 9],
            [1, 10],
            [0, 10],
            [0, 9],
          ],
        ],
      ],
    };
    const path = polygonToSvgPath(geometry, project);
    expect(path.match(/M/g)?.length).toBe(2);
    expect(path.match(/Z/g)?.length).toBe(2);
  });
});
