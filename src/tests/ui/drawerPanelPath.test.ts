import { drawerPanelPath } from '../../shared/ui/cardShape';

/**
 * The drawer silhouette, like the card's, is a path string that no style object
 * reveals. What matters here is the opposite of the card: both **left** corners
 * cut, both right corners square, and a much shallower angle than 45 degrees.
 */
function points(path: string): [number, number][] {
  return [...path.matchAll(/-?\d+(?:\.\d+)?\s-?\d+(?:\.\d+)?/g)]
    .map((m) => m[0].split(/\s+/).map(Number) as [number, number]);
}

describe('drawerPanelPath', () => {
  const base = { width: 288, height: 880, topCut: 202, bottomCut: 202 };

  it('is a four-cornered panel with no curves', () => {
    const path = drawerPanelPath({ ...base, inset: 0 });

    expect(path).not.toMatch(/[AaQqCcSsTt]/);
    expect(points(path)).toHaveLength(4);
    expect(path.endsWith('Z')).toBe(true);
  });

  it('keeps the right edge flush and square, top and bottom', () => {
    const path = drawerPanelPath({ ...base, inset: 0 });

    // Starts at the top-right corner and ends at the bottom-right one, so the
    // right side is one straight edge at full width.
    expect(path.startsWith('M 288 0')).toBe(true);
    expect(path).toContain('L 288 880');

    const atFullWidth = points(path).filter(([x]) => x === 288);
    expect(atFullWidth.map(([, y]) => y).sort((a, b) => a - b)).toEqual([0, 880]);
  });

  it('cuts both left corners, so the left edge is only the middle band', () => {
    const path = drawerPanelPath({ ...base, inset: 0 });

    // The left edge exists only between the two cuts.
    expect(path).toContain('L 0 202');
    expect(path).toContain('L 0 678');

    const atLeft = points(path).filter(([x]) => x === 0);
    expect(atLeft).toHaveLength(2);
  });

  it('cuts far shallower than 45 degrees — this is not a chamfered card', () => {
    const path = drawerPanelPath({ ...base, inset: 0 });
    const pts = points(path);

    // Top cut: from (width, 0) to (0, topCut). At 45 degrees the vertical run
    // would equal the width; here it is ~0.7 of it, about 35 degrees.
    const [[x0, y0], [x1, y1]] = [pts[0], pts[1]];
    const horizontal = Math.abs(x1 - x0);
    const vertical = Math.abs(y1 - y0);
    expect(horizontal).toBe(288);
    expect(vertical / horizontal).toBeCloseTo(0.7, 2);
    expect(vertical).toBeLessThan(horizontal); // shallower than 45 degrees
  });

  it('allows asymmetric cuts', () => {
    const path = drawerPanelPath({ width: 200, height: 600, topCut: 100, bottomCut: 250, inset: 0 });

    expect(path).toContain('L 0 100');
    expect(path).toContain('L 0 350');
  });

  it('scales both cuts down together when they exceed the height', () => {
    // A short panel cannot host two 202 cuts; clamping them separately would let
    // the top cut land below the bottom one and turn the panel inside out.
    const path = drawerPanelPath({ width: 288, height: 200, topCut: 202, bottomCut: 202, inset: 0 });
    const pts = points(path);
    const lefts = pts.filter(([x]) => x === 0).map(([, y]) => y);

    expect(lefts).toHaveLength(2);
    expect(lefts[0]).toBeLessThanOrEqual(lefts[1]);
    for (const [x, y] of pts) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(288);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(200);
    }
  });

  it('insets the path so a centred stroke is not half-clipped', () => {
    const path = drawerPanelPath({ ...base, inset: 0.5 });

    expect(path.startsWith('M 287.5 0.5')).toBe(true);
    expect(path).toContain('L 0.5 202.5');
  });

  it('survives a zero-sized layout pass', () => {
    const path = drawerPanelPath({ width: 0, height: 0, topCut: 202, bottomCut: 202, inset: 0 });

    expect(path).toContain('Z');
    for (const [x, y] of points(path)) {
      expect(Number.isFinite(x)).toBe(true);
      expect(Number.isFinite(y)).toBe(true);
    }
  });

  it('rounds coordinates rather than emitting long floats', () => {
    const path = drawerPanelPath({ width: 288 / 7, height: 880 / 3, topCut: 202 / 7, bottomCut: 202 / 7 });

    expect(path).not.toMatch(/\d\.\d{4}/);
  });
});
