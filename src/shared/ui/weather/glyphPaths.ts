/**
 * The weather glyph geometry, on a 24x24 grid.
 *
 * Thin outline strokes rather than filled shapes, matching the neumorphic
 * weather icon set the design was drawn from: a soft surface wants a light
 * line on it, and a solid silhouette at these sizes flattens back into a blob.
 *
 * Hand-written path data rather than imported `.svg` files — `metro.config.js`
 * registers no SVG transformer, so an `.svg` cannot be a component here. That
 * is already the house pattern; `ui/DoodleWallpaper.tsx` draws its pattern the
 * same way.
 *
 * Kept apart from the component so the shapes have one home and the animation
 * logic stays readable. Plain strings, no React.
 */

/** A cloud with its flat base on y=17, spanning most of the width. */
export const CLOUD = 'M7.2 17.2a3.6 3.6 0 0 1-.3-7.18 5 5 0 0 1 9.6-1.1 3.9 3.9 0 0 1 .4 7.78Z';

/** The smaller cloud used where a sun or moon shares the frame. */
export const CLOUD_SMALL = 'M8.4 18.4a3.1 3.1 0 0 1-.26-6.18 4.3 4.3 0 0 1 8.26-.95 3.35 3.35 0 0 1 .34 6.69Z';

/** The sun's disc, centred so it can rotate its rays about the same point. */
export const SUN_DISC = { cx: 12, cy: 12, r: 4.2 };

/** Where the disc sits when a cloud shares the frame: up and to the right, so
 * the cloud's shoulder passes in front of it. */
export const SUN_DISC_OFFSET = { cx: 15.6, cy: 8.2, r: 3.4 };

/**
 * Eight rays as line segments, at 45 degree steps around the disc.
 *
 * Generated rather than typed out: the eight are identical but for the angle,
 * and a hand-written list of sixteen coordinates is a list of sixteen chances
 * to fat-finger one and leave a ray fractionally off true.
 */
export function sunRays(cx: number, cy: number, inner: number, outer: number): { x1: number; y1: number; x2: number; y2: number }[] {
  return Array.from({ length: 8 }, (_, index) => {
    const angle = (index * Math.PI) / 4;
    const sin = Math.sin(angle);
    const cos = Math.cos(angle);
    return {
      x1: round(cx + cos * inner),
      y1: round(cy + sin * inner),
      x2: round(cx + cos * outer),
      y2: round(cy + sin * outer),
    };
  });
}

/** The crescent, as one closed path: an outer arc and a tighter inner one
 * sweeping back, which is what cuts the bite out of the disc. */
export const MOON = 'M20 15.2A8.6 8.6 0 0 1 9.2 4.2a7.4 7.4 0 1 0 10.8 11Z';

/** Three fog bands, each a horizontal rule at a different width so the stack
 * reads as haze rather than as a hamburger menu. */
export const FOG_BANDS = [
  { x1: 4.5, x2: 19.5, y: 13 },
  { x1: 6.5, x2: 17.5, y: 16.5 },
  { x1: 4.5, x2: 15.5, y: 20 },
];

/* No wind glyph. The reference set has a lovely one, but WMO 4677 has no wind
   code — wind is a separate measurement, not a sky condition — so nothing in
   this app could ever select it. StatTile already shows wind speed as a
   number, which is what a farmer needs from it. */

/** Where each drop hangs under the cloud. `delay` staggers the fall so the
 * rain does not pulse as one block. */
export type Drop = { x: number; y: number; delay: number };

export const DROPS_LIGHT: Drop[] = [
  { x: 9, y: 19, delay: 0 },
  { x: 15, y: 19, delay: 400 },
];

export const DROPS_RAIN: Drop[] = [
  { x: 8, y: 19, delay: 0 },
  { x: 12, y: 19, delay: 260 },
  { x: 16, y: 19, delay: 520 },
];

export const DROPS_HEAVY: Drop[] = [
  { x: 7, y: 19, delay: 0 },
  { x: 10.5, y: 19, delay: 150 },
  { x: 14, y: 19, delay: 300 },
  { x: 17.5, y: 19, delay: 450 },
];

/** The lightning bolt, hanging where the middle drop would be. */
export const BOLT = 'M13.2 17.4h-3l2.4-5.2-4.2 5.2h3l-2.4 5.2Z';

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
