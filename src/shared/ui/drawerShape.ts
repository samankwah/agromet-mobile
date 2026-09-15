/**
 * The menu drawer's silhouette: a right-anchored panel whose two **left**
 * corners are cut away on a shallow diagonal, leaving the right edge flush
 * against the screen.
 *
 * This shape was in the app before the soft-UI rebuild, went away with it
 * because a rounded corner was the house style, and is back because the design
 * reference asks for it by name. It is restored on its own rather than by
 * bringing back the whole `cardShape.ts` it used to live in: the rest of that
 * file cut corners on *cards*, which soft UI genuinely did replace with radii,
 * and only the drawer wants a straight cut now.
 *
 * It has to be a path. No `borderRadius` cuts a corner straight, let alone at a
 * shallow angle, so the panel paints its own background and the container View
 * behind it stays transparent.
 *
 * The cuts are measured as a **vertical run** rather than an angle, because a
 * run is what the caller can clamp against the panel height. With the panel's
 * own width as the horizontal run, `cut = width * 0.7` gives the reference's
 * roughly 35 degrees.
 */
export type DrawerPanelOptions = {
  width: number;
  height: number;
  /** Vertical run of the diagonal cutting the top-left corner. */
  topCut: number;
  /** Vertical run of the diagonal cutting the bottom-left corner. */
  bottomCut: number;
  /**
   * How much to round the points where the edges meet. 0 leaves them sharp.
   *
   * The two that matter are the apexes on the left edge, where each diagonal
   * runs into the vertical. Cut straight they come to a spike, which reads as
   * torn rather than folded — a corner radius is what makes the same silhouette
   * look cut on purpose.
   */
  radius?: number;
  /** Keeps a centred stroke off the edge, so the rim is not half-clipped. */
  inset?: number;
};

export function drawerPanelPath({ width, height, topCut, bottomCut, radius = 0, inset = 0.5 }: DrawerPanelOptions): string {
  const x0 = inset;
  const y0 = inset;
  const x1 = width - inset;
  const y1 = height - inset;

  const h = Math.max(0, y1 - y0);

  // Both cuts eat into the same left edge, so it is their sum that has to fit.
  // Clamping them separately would let the top cut cross below the bottom one
  // and render the panel inside out.
  let top = Math.max(0, Math.min(topCut, h));
  let bottom = Math.max(0, Math.min(bottomCut, h));
  if (top + bottom > h && top + bottom > 0) {
    const scale = h / (top + bottom);
    top *= scale;
    bottom *= scale;
  }

  const corners: Point[] = [
    { x: x1, y: y0 }, // top right, flush with the screen edge
    { x: x0, y: y0 + top }, // where the top diagonal meets the left edge
    { x: x0, y: y1 - bottom }, // where the left edge meets the bottom diagonal
    { x: x1, y: y1 }, // bottom right
  ];

  return roundedPolygon(corners, radius);
}

type Point = { x: number; y: number };

/**
 * A closed polygon with its corners rounded off.
 *
 * Each corner is replaced by a quadratic curve whose control point *is* the
 * original corner, entered and left `r` along the two edges that meet there.
 * That keeps the curve tangent to both edges, so a rounded corner sits exactly
 * where the sharp one did rather than pulling the edges out of line.
 *
 * `r` is clamped per corner to half the shorter adjoining edge. Without that, a
 * radius larger than an edge would let two corners consume the same edge twice
 * and fold the outline back through itself — which on this shape happens on a
 * short panel, where the two cuts nearly meet.
 */
function roundedPolygon(points: Point[], radius: number): string {
  const count = points.length;
  const commands: string[] = [];

  for (let index = 0; index < count; index += 1) {
    const current = points[index];
    const previous = points[(index - 1 + count) % count];
    const next = points[(index + 1) % count];

    const toPrevious = toward(current, previous);
    const toNext = toward(current, next);
    const r = Math.max(0, Math.min(radius, toPrevious.length / 2, toNext.length / 2));

    const entry = { x: current.x + toPrevious.x * r, y: current.y + toPrevious.y * r };
    const exit = { x: current.x + toNext.x * r, y: current.y + toNext.y * r };

    commands.push(`${index === 0 ? 'M' : 'L'} ${round(entry.x)} ${round(entry.y)}`);
    if (r > 0) commands.push(`Q ${round(current.x)} ${round(current.y)} ${round(exit.x)} ${round(exit.y)}`);
  }

  commands.push('Z');
  return commands.join(' ');
}

/** The unit vector from `from` towards `to`, plus the distance between them.
 * Both are wanted at every call site, and computing the length twice is the
 * easy way to have them disagree after an edit. */
function toward(from: Point, to: Point): { x: number; y: number; length: number } {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  if (length === 0) return { x: 0, y: 0, length: 0 };
  return { x: dx / length, y: dy / length, length };
}

/** Path data is a string, so a float with 15 decimals is 15 characters of
 * nothing. Two is finer than a device pixel at any density this app runs at. */
function round(value: number): number {
  return Math.round(value * 100) / 100;
}
