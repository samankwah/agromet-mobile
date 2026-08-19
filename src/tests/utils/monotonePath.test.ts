import { monotoneAreaPath, monotoneLinePath, type PathPoint } from '../../shared/utils/monotonePath';

const identity = (v: number) => v;

/** Pulls the cubic segments back out of the path string so the curve can be
 * evaluated between the data points — which is the only place an overshoot
 * could hide. */
function segments(path: string): { p0: PathPoint; c1: PathPoint; c2: PathPoint; p1: PathPoint }[] {
  const start = path.match(/^M ([-\d.]+) ([-\d.]+)/);
  if (!start) return [];
  let cursor: PathPoint = { x: Number(start[1]), y: Number(start[2]) };

  const out: { p0: PathPoint; c1: PathPoint; c2: PathPoint; p1: PathPoint }[] = [];
  const curve = /C ([-\d.]+) ([-\d.]+) ([-\d.]+) ([-\d.]+) ([-\d.]+) ([-\d.]+)/g;
  let match: RegExpExecArray | null;
  while ((match = curve.exec(path)) !== null) {
    const [, c1x, c1y, c2x, c2y, px, py] = match.map(Number) as unknown as number[];
    const p1 = { x: px, y: py };
    out.push({ p0: cursor, c1: { x: c1x, y: c1y }, c2: { x: c2x, y: c2y }, p1 });
    cursor = p1;
  }
  return out;
}

function bezierY(seg: { p0: PathPoint; c1: PathPoint; c2: PathPoint; p1: PathPoint }, t: number): number {
  const u = 1 - t;
  return u * u * u * seg.p0.y + 3 * u * u * t * seg.c1.y + 3 * u * t * t * seg.c2.y + t * t * t * seg.p1.y;
}

describe('monotoneLinePath', () => {
  it('never overshoots the data — the guarantee the whole module exists for', () => {
    // A deliberately awkward curve: a sharp peak, a plateau, and a sharp
    // trough are exactly where Catmull-Rom would bulge past the data.
    const points: PathPoint[] = [
      { x: 0, y: 10 },
      { x: 1, y: 10 },
      { x: 2, y: 30 },
      { x: 3, y: 12 },
      { x: 4, y: 12 },
      { x: 5, y: 12 },
      { x: 6, y: 2 },
      { x: 7, y: 25 },
      { x: 8, y: 24 },
    ];

    for (const seg of segments(monotoneLinePath(points, identity, identity))) {
      const lo = Math.min(seg.p0.y, seg.p1.y);
      const hi = Math.max(seg.p0.y, seg.p1.y);
      for (let t = 0; t <= 1; t += 0.02) {
        const y = bezierY(seg, t);
        // Tiny epsilon for the 2dp rounding in the emitted path.
        expect(y).toBeGreaterThanOrEqual(lo - 0.02);
        expect(y).toBeLessThanOrEqual(hi + 0.02);
      }
    }
  });

  it('holds a plateau flat instead of rippling through it', () => {
    const points: PathPoint[] = [
      { x: 0, y: 5 },
      { x: 1, y: 20 },
      { x: 2, y: 20 },
      { x: 3, y: 20 },
      { x: 4, y: 5 },
    ];
    const flat = segments(monotoneLinePath(points, identity, identity)).filter((s) => s.p0.y === 20 && s.p1.y === 20);

    expect(flat.length).toBeGreaterThan(0);
    for (const seg of flat) {
      for (let t = 0; t <= 1; t += 0.05) {
        expect(bezierY(seg, t)).toBeCloseTo(20, 5);
      }
    }
  });

  it('passes exactly through every data point', () => {
    const points: PathPoint[] = [
      { x: 0, y: 3 },
      { x: 1, y: 9 },
      { x: 2, y: 4 },
      { x: 3, y: 11 },
    ];
    const segs = segments(monotoneLinePath(points, identity, identity));

    expect(segs).toHaveLength(3);
    segs.forEach((seg, i) => {
      expect(seg.p0.y).toBeCloseTo(points[i].y, 2);
      expect(seg.p1.y).toBeCloseTo(points[i + 1].y, 2);
    });
  });

  it('scales through the projection functions rather than assuming pixel space', () => {
    const points: PathPoint[] = [
      { x: 0, y: 0 },
      { x: 1, y: 10 },
      { x: 2, y: 20 },
    ];
    const path = monotoneLinePath(
      points,
      (x) => x * 100,
      (y) => 200 - y * 2,
    );

    expect(path.startsWith('M 0.00 200.00')).toBe(true);
    expect(path).toContain('200.00 160.00'); // final point: x=2 -> 200, y=20 -> 160
  });

  it('handles the degenerate inputs a chart can actually receive', () => {
    expect(monotoneLinePath([], identity, identity)).toBe('');
    expect(monotoneLinePath([{ x: 1, y: 2 }], identity, identity)).toBe('M 1.00 2.00');
    // Two points can't have a meaningful tangent — a straight line is correct.
    expect(
      monotoneLinePath(
        [
          { x: 0, y: 0 },
          { x: 1, y: 5 },
        ],
        identity,
        identity,
      ),
    ).toBe('M 0.00 0.00 L 1.00 5.00');
  });
});

describe('monotoneAreaPath', () => {
  it('closes the curve down to the baseline so it can be filled', () => {
    const points: PathPoint[] = [
      { x: 0, y: 4 },
      { x: 1, y: 8 },
      { x: 2, y: 6 },
    ];
    const area = monotoneAreaPath(points, identity, identity, 100);

    expect(area.endsWith('L 2.00 100.00 L 0.00 100.00 Z')).toBe(true);
    // The visible edge must be the identical curve the line stroke draws,
    // or the fill and the line would disagree along the top.
    expect(area.startsWith(monotoneLinePath(points, identity, identity))).toBe(true);
  });

  it('returns empty for no points rather than a stray baseline rectangle', () => {
    expect(monotoneAreaPath([], identity, identity, 100)).toBe('');
  });
});
