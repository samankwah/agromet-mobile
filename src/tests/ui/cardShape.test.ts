import { chamferedRectPath } from '../../shared/ui/cardShape';

/**
 * The card silhouette is the one piece of the design that cannot be checked by
 * reading a style object: it is a path string.
 *
 * The load-bearing assertion is that every corner is a *straight* 45-degree cut
 * and none is an arc. An earlier version drew the minor pair as arcs, because a
 * coarse sampling step made a linear inset profile look convex on the reference;
 * re-measuring at 1px resolution showed a perfectly straight line. These tests
 * exist so that mistake cannot come back silently.
 */

/** Pulls the coordinate pairs out of a path, in order. */
function points(path: string): [number, number][] {
  return [...path.matchAll(/-?\d+(?:\.\d+)?\s-?\d+(?:\.\d+)?/g)]
    .map((m) => m[0].split(/\s+/).map(Number) as [number, number]);
}

describe('chamferedRectPath', () => {
  const base = { width: 300, height: 200, chamfer: 12, minorChamfer: 6 };

  it('never emits an arc — every corner is a straight cut', () => {
    const path = chamferedRectPath({ ...base, inset: 0 });

    expect(path).not.toContain('A');
    expect(path).not.toMatch(/[QqCcSsTt]/);
    // Eight vertices: two per corner, all joined by straight lines.
    expect(points(path)).toHaveLength(8);
  });

  it('cuts the top-left and bottom-right by the major chamfer', () => {
    const path = chamferedRectPath({ ...base, inset: 0 });

    // Top-left: starts at (chamfer, 0) and closes from (0, chamfer) — the same
    // distance along both axes, which is what makes it 45 degrees.
    expect(path.startsWith('M 12 0')).toBe(true);
    expect(path).toContain('L 0 12');

    // Bottom-right: (width, height - chamfer) -> (width - chamfer, height).
    expect(path).toContain('L 300 188');
    expect(path).toContain('L 288 200');
  });

  it('cuts the top-right and bottom-left by the smaller minor chamfer', () => {
    const path = chamferedRectPath({ ...base, inset: 0 });

    // Top-right, 6 not 12.
    expect(path).toContain('L 294 0');
    expect(path).toContain('L 300 6');

    // Bottom-left.
    expect(path).toContain('L 6 200');
    expect(path).toContain('L 0 194');
  });

  it('keeps both cuts at 45 degrees, so each corner drops as far as it runs', () => {
    const path = chamferedRectPath({ width: 400, height: 260, chamfer: 20, minorChamfer: 9, inset: 0 });
    const pts = points(path);

    // Walk consecutive vertices; a corner cut moves diagonally by equal amounts
    // on both axes, while a straight edge moves along one axis only.
    const diagonals = pts
      .map((p, i) => [p, pts[(i + 1) % pts.length]] as const)
      .map(([[ax, ay], [bx, by]]) => [Math.abs(bx - ax), Math.abs(by - ay)])
      .filter(([dx, dy]) => dx > 0 && dy > 0);

    expect(diagonals).toHaveLength(4);
    for (const [dx, dy] of diagonals) {
      expect(dx).toBeCloseTo(dy, 6);
    }
    expect(diagonals.map(([dx]) => dx).sort((a, b) => a - b)).toEqual([9, 9, 20, 20]);
  });

  it('defaults the minor cut to the major one, giving a symmetrical octagon', () => {
    // What the bottom tab bar uses: all four corners cut equally.
    const implicit = chamferedRectPath({ width: 300, height: 100, chamfer: 12 });
    const explicit = chamferedRectPath({ width: 300, height: 100, chamfer: 12, minorChamfer: 12 });

    expect(implicit).toBe(explicit);

    const xs = points(implicit).map(([x]) => x);
    // Mirroring about the centre maps the vertex set onto itself.
    expect([...xs].sort((a, b) => a - b)).toEqual([...xs.map((x) => 300 - x)].sort((a, b) => a - b));
  });

  it('leaves the minor corners square when the minor cut is zero', () => {
    // The reference's nested score box: chamfered on one diagonal, square on the
    // other.
    const path = chamferedRectPath({ width: 200, height: 120, chamfer: 10, minorChamfer: 0, inset: 0 });

    expect(path).toContain('L 200 0'); // top-right, uncut
    expect(path).toContain('L 0 120'); // bottom-left, uncut
    expect(path.startsWith('M 10 0')).toBe(true);
  });

  it('insets the path so a centred stroke is not half-clipped', () => {
    const path = chamferedRectPath({ ...base, inset: 0.5 });

    expect(path.startsWith('M 12.5 0.5')).toBe(true);
    expect(path).toContain('L 299.5 187.5');
  });

  it('scales both cuts down together on a card smaller than its own corners', () => {
    // 20x20 cannot host a 12 and a 6 cut on the same edge; clamping them
    // separately would fold the path into a bowtie.
    const path = chamferedRectPath({ width: 20, height: 20, chamfer: 12, minorChamfer: 6, inset: 0 });

    for (const [x, y] of points(path)) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(20);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(20);
    }
    // Still a closed octagon, and the major cut is still the larger of the two.
    const pts = points(path);
    expect(pts).toHaveLength(8);
    expect(pts[0][0]).toBeGreaterThan(20 - pts[1][0]);
  });

  it('survives a zero-sized layout pass', () => {
    const path = chamferedRectPath({ width: 0, height: 0, chamfer: 12, minorChamfer: 6, inset: 0 });

    expect(path).toContain('Z');
    for (const [x, y] of points(path)) {
      expect(Number.isFinite(x)).toBe(true);
      expect(Number.isFinite(y)).toBe(true);
    }
  });

  it('rounds coordinates rather than emitting long floats', () => {
    const path = chamferedRectPath({ width: 300 / 7, height: 200 / 3, chamfer: 12, minorChamfer: 6 });

    expect(path).not.toMatch(/\d\.\d{4}/);
  });
});
