export type PathPoint = { x: number; y: number };

/**
 * Monotone cubic interpolation (Fritsch-Carlson), as SVG path data.
 *
 * The obvious smoothing choice — Catmull-Rom — overshoots at local
 * extrema: it would draw the temperature curve *above* the day's stated
 * high, just past the "H" marker, and below its low. That reads as a bug
 * to anyone who compares the curve against the numbers beside it, and it
 * would contradict the forecast service's own guarantee that every hourly
 * value sits inside the day's min/max.
 *
 * Fritsch-Carlson clamps each tangent to the neighbouring secants, so the
 * interpolant is provably bounded by the data it passes through — no
 * overshoot is possible, at any point density.
 */

/** Tangents (dy/dx) at each point, clamped so no cubic segment overshoots. */
function monotoneTangents(points: PathPoint[]): number[] {
  const n = points.length;
  const secants: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    const dx = points[i + 1].x - points[i].x;
    secants.push(dx === 0 ? 0 : (points[i + 1].y - points[i].y) / dx);
  }

  // Start with the average of the two adjacent secants (one-sided at the ends).
  const tangents = [secants[0]];
  for (let i = 1; i < n - 1; i++) {
    tangents.push(secants[i - 1] * secants[i] <= 0 ? 0 : (secants[i - 1] + secants[i]) / 2);
  }
  tangents.push(secants[n - 2]);

  // Then clamp. This loop is what makes the curve monotone: a tangent
  // steeper than 3x its adjoining secant is exactly what produces an
  // overshooting hump between two points.
  for (let i = 0; i < n - 1; i++) {
    if (secants[i] === 0) {
      tangents[i] = 0;
      tangents[i + 1] = 0;
      continue;
    }
    let a = tangents[i] / secants[i];
    let b = tangents[i + 1] / secants[i];
    // A tangent pointing against its secant would reverse the curve inside
    // the interval. The turning-point rule above already prevents this for
    // interior points; these two guards cover the endpoints, where the
    // tangent is taken one-sided.
    if (a < 0) {
      tangents[i] = 0;
      a = 0;
    }
    if (b < 0) {
      tangents[i + 1] = 0;
      b = 0;
    }
    const s = a * a + b * b;
    if (s > 9) {
      const t = (3 / Math.sqrt(s)) * secants[i];
      tangents[i] = t * a;
      tangents[i + 1] = t * b;
    }
  }

  return tangents;
}

/**
 * The line itself. `toX`/`toY` map data space to pixel space, so the
 * tangents are computed on the real values and only projected at the end —
 * keeping this module free of any chart layout knowledge.
 */
export function monotoneLinePath(points: PathPoint[], toX: (x: number) => number, toY: (y: number) => number): string {
  if (points.length === 0) return '';
  const move = `M ${toX(points[0].x).toFixed(2)} ${toY(points[0].y).toFixed(2)}`;
  if (points.length === 1) return move;
  if (points.length === 2) {
    return `${move} L ${toX(points[1].x).toFixed(2)} ${toY(points[1].y).toFixed(2)}`;
  }

  const tangents = monotoneTangents(points);
  let path = move;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    // Cubic Hermite -> Bezier: control points sit a third of the interval
    // along each endpoint's tangent.
    const third = (p1.x - p0.x) / 3;
    const c1x = p0.x + third;
    const c1y = p0.y + tangents[i] * third;
    const c2x = p1.x - third;
    const c2y = p1.y - tangents[i + 1] * third;
    path +=
      ` C ${toX(c1x).toFixed(2)} ${toY(c1y).toFixed(2)}` +
      ` ${toX(c2x).toFixed(2)} ${toY(c2y).toFixed(2)}` +
      ` ${toX(p1.x).toFixed(2)} ${toY(p1.y).toFixed(2)}`;
  }

  return path;
}

/** The same curve, closed down to `baselineY` so it can be filled. */
export function monotoneAreaPath(points: PathPoint[], toX: (x: number) => number, toY: (y: number) => number, baselineY: number): string {
  const line = monotoneLinePath(points, toX, toY);
  if (!line) return '';
  const lastX = toX(points[points.length - 1].x).toFixed(2);
  const firstX = toX(points[0].x).toFixed(2);
  const base = baselineY.toFixed(2);
  return `${line} L ${lastX} ${base} L ${firstX} ${base} Z`;
}
