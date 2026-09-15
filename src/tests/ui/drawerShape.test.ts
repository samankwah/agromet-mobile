import { drawerPanelPath } from '../../shared/ui/drawerShape';

/* Pure geometry, so it is tested directly rather than through a render — the
   same reasoning as theme/depth.test.ts. The path is the menu drawer's whole
   silhouette: get it wrong and the panel renders inside out, which is not
   something a snapshot of a React tree would catch. */

/** Every coordinate pair in a path string, in order. */
function points(path: string): { x: number; y: number }[] {
  const numbers = path.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i + 1 < numbers.length; i += 2) out.push({ x: numbers[i], y: numbers[i + 1] });
  return out;
}

describe('drawerPanelPath', () => {
  const base = { width: 340, height: 2400, topCut: 238, bottomCut: 238 };

  it('closes, and keeps every point inside the box', () => {
    const path = drawerPanelPath({ ...base, radius: 20 });
    expect(path.startsWith('M ')).toBe(true);
    expect(path.trimEnd().endsWith('Z')).toBe(true);

    for (const { x, y } of points(path)) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(base.width);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(base.height);
    }
  });

  it('rounds the corners only when asked', () => {
    // The sharp version is what shipped first; the curve is the later request,
    // so both have to stay expressible from the same function.
    expect(drawerPanelPath({ ...base, radius: 0 })).not.toContain('Q');
    expect(drawerPanelPath({ ...base, radius: 20 })).toContain('Q');
  });

  it('puts a curve at each of the four corners', () => {
    const curves = drawerPanelPath({ ...base, radius: 20 }).match(/Q/g) ?? [];
    expect(curves).toHaveLength(4);
  });

  it('keeps the cut diagonal rather than rounding it away', () => {
    // The radius must eat the corner, not the edge: with a 238dp cut, a 20dp
    // round still has to leave the left edge well short of the full height.
    const ys = points(drawerPanelPath({ ...base, radius: 20 })).map((p) => p.y);
    expect(Math.min(...ys)).toBeLessThan(base.height * 0.2);
    expect(Math.max(...ys)).toBeGreaterThan(base.height * 0.8);
  });

  it('clamps both cuts against the height rather than folding inside out', () => {
    // Two 238dp cuts cannot both fit in a 120dp panel. Scaled down they must
    // still leave the top apex above the bottom one.
    const short = drawerPanelPath({ width: 340, height: 120, topCut: 238, bottomCut: 238, radius: 20 });
    for (const { y } of points(short)) {
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(120);
    }
  });

  it('survives a radius larger than the edges it has to fit between', () => {
    // Clamping is per corner, to half the shorter adjoining edge. Without it
    // two corners would consume the same edge twice.
    const silly = drawerPanelPath({ width: 340, height: 300, topCut: 100, bottomCut: 100, radius: 9999 });
    for (const { x, y } of points(silly)) {
      expect(Number.isFinite(x)).toBe(true);
      expect(Number.isFinite(y)).toBe(true);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(300);
    }
  });
});
