/**
 * The card silhouette, as an SVG path.
 *
 * Every corner is cut straight at 45 degrees — none of them is rounded. What
 * varies is *how far*: the top-left and bottom-right take a `chamfer`, and the
 * top-right and bottom-left a smaller `minorChamfer`, roughly half of it. That
 * unequal pair along the top-left/bottom-right axis is the whole character of
 * the design; cutting all four equally reads as a plain octagon and loses it.
 *
 * Measured off the reference at 1px resolution, then least-squares fitted: all
 * four inset profiles are straight lines (the top-right deviates 0.0px over 12
 * rows, which no circular arc can do). An earlier version of this drew the
 * minor pair as arcs — a coarse 3px sampling step made a linear ramp look
 * convex. If you are tempted to reintroduce a radius here, re-measure first.
 *
 * A `borderRadius` cannot express any of this, which is why Card paints its
 * background as an `Svg` `Path` rather than relying on the View's own border.
 *
 * Pure and separate from Card so the geometry has one tested home — see
 * tests/ui/cardShape.test.ts. Takes plain numbers, returns a path string.
 */

export type CardShapeOptions = {
  width: number;
  height: number;
  /** The 45-degree cut on the top-left and bottom-right corners. */
  chamfer: number;
  /**
   * The smaller 45-degree cut on the top-right and bottom-left corners.
   * Defaults to `chamfer`, giving a symmetrical octagon — which is what the
   * bottom tab bar wants, but not a card.
   */
  minorChamfer?: number;
  /**
   * Pulls the path in from the box edge so a stroke centred on it stays
   * fully inside the card rather than being half-clipped. Defaults to half
   * of a 1px stroke.
   */
  inset?: number;
};

/**
 * Rounds to 3dp. Path strings go straight into native SVG parsing, and
 * fractional layout widths (a flex child on a 2.75x screen) would otherwise
 * produce 15-digit floats in every card's path on every re-measure.
 */
function n(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export function chamferedRectPath({
  width,
  height,
  chamfer,
  minorChamfer = chamfer,
  inset = 0.5,
}: CardShapeOptions): string {
  const x0 = inset;
  const y0 = inset;
  const x1 = width - inset;
  const y1 = height - inset;

  const w = x1 - x0;
  const h = y1 - y0;

  // A card can be laid out smaller than its own corner treatment (a narrow grid
  // cell, or the first frame before content arrives). Every edge carries one cut
  // of each size, so it is the *pair* that has to fit; clamping them
  // individually would still let the path fold back on itself into a bowtie.
  const bound = Math.max(0, Math.min(w, h));
  let c = Math.max(0, Math.min(chamfer, bound));
  let m = Math.max(0, Math.min(minorChamfer, bound));
  if (c + m > bound) {
    const scale = bound / (c + m);
    c *= scale;
    m *= scale;
  }

  return [
    `M ${n(x0 + c)} ${n(y0)}`,
    `L ${n(x1 - m)} ${n(y0)}`,
    `L ${n(x1)} ${n(y0 + m)}`,
    `L ${n(x1)} ${n(y1 - c)}`,
    `L ${n(x1 - c)} ${n(y1)}`,
    `L ${n(x0 + m)} ${n(y1)}`,
    `L ${n(x0)} ${n(y1 - m)}`,
    `L ${n(x0)} ${n(y0 + c)}`,
    'Z',
  ].join(' ');
}

export type DrawerPanelOptions = {
  width: number;
  height: number;
  /** Vertical run of the diagonal cutting the top-left corner. */
  topCut: number;
  /** Vertical run of the diagonal cutting the bottom-left corner. */
  bottomCut: number;
  /** As `CardShapeOptions.inset` — keeps a centred stroke off the edge. */
  inset?: number;
};

/**
 * The menu drawer's silhouette: a right-anchored panel whose two **left**
 * corners are cut away, leaving the right edge flush against the screen.
 *
 * Deliberately not a variant of `chamferedRectPath`. That one cuts *opposite*
 * corners at 45 degrees, which is a card; this cuts *both left* corners at a
 * much shallower angle and keeps the right ones square. Sharing one function
 * would mean a corner-selection parameter that neither caller wants.
 *
 * The cuts are measured as a vertical run rather than an angle, because that is
 * what the caller can clamp against the panel height. With the panel's own width
 * as the horizontal run, `cut = width * 0.7` gives the reference's ~35 degrees.
 */
export function drawerPanelPath({ width, height, topCut, bottomCut, inset = 0.5 }: DrawerPanelOptions): string {
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

  return [
    `M ${n(x1)} ${n(y0)}`,
    `L ${n(x0)} ${n(y0 + top)}`,
    `L ${n(x0)} ${n(y1 - bottom)}`,
    `L ${n(x1)} ${n(y1)}`,
    'Z',
  ].join(' ');
}
