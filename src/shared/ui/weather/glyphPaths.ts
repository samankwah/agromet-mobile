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

/**
 * A cloud with its flat base on y=17.
 *
 * Cubic curves, not elliptical arcs. An earlier version used `a` commands and
 * came out as a comma-shaped blob on device: the sweep and large-arc flags are
 * easy to get subtly wrong by hand and impossible to eyeball from the string.
 * Every control point below is a coordinate you can read straight off the
 * shape, which is worth the extra characters.
 *
 * Left lobe, big top lobe, right lobe, then `Z` closes the flat base.
 */
export const CLOUD =
  'M5.5 17C3.6 17 2 15.4 2 13.5C2 11.7 3.4 10.2 5.2 10C5.8 7.7 7.9 6 10.4 6' +
  'C12.9 6 15 7.7 15.6 10C15.9 9.9 16.2 9.9 16.5 9.9C18.4 9.9 20 11.5 20 13.45' +
  'C20 15.4 18.4 17 16.5 17Z';

/** The same cloud, smaller and shifted down-left, for the frames where a sun
 * or moon sits behind it. Drawn as its own path rather than a transform so the
 * stroke keeps its weight; scaling a stroked path thins the line with it. */
export const CLOUD_SMALL =
  'M7.2 18.4C5.7 18.4 4.5 17.2 4.5 15.7C4.5 14.3 5.6 13.1 7 13' +
  'C7.5 11.2 9.1 9.9 11 9.9C12.9 9.9 14.5 11.2 15 13C15.2 12.9 15.4 12.9 15.7 12.9' +
  'C17.2 12.9 18.4 14.1 18.4 15.65C18.4 17.2 17.2 18.4 15.7 18.4Z';

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

/**
 * The crescent: a small arc cutting the bite, then a large one sweeping the
 * outer edge. The two arc flags are the whole trick — the inner arc takes the
 * short way round and the outer one the long way, which is what leaves a
 * crescent rather than a lens or a full disc.
 */
export const MOON = 'M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z';

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

/** The lightning bolt, hanging below the cloud where the middle drop would be.
 * Filled rather than stroked, so it reads at 17dp where an outlined zigzag
 * this small closes up into a smudge. */
export const BOLT = 'M12.8 17.2 L9.6 21.2 L11.8 21.2 L11 23.8 L14.4 19.6 L12.2 19.6 Z';

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
