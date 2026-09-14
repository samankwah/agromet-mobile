/**
 * Opaque colour tints.
 *
 * The obvious way to tint a panel is an alpha suffix on the accent colour —
 * `accent + '14'` — and that is fine for anything drawn *inside* an opaque
 * card. It is wrong for the card itself: Android paints `elevation` shadow
 * behind the view, so a translucent background lets the shadow through and the
 * panel renders with a grey ring around it and a muddied fill. Blending the
 * tint down to an opaque colour up front avoids that, and costs nothing.
 */

function channels(hex: string): [number, number, number] {
  const value = hex.replace('#', '');
  const full =
    value.length === 3
      ? value
          .split('')
          .map((char) => char + char)
          .join('')
      : value.slice(0, 6);

  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

/**
 * `ratio` of `color` painted over `over`, as an opaque hex.
 *
 * Both arguments must be opaque hex — the theme's colours all are.
 */
export function tint(color: string, over: string, ratio: number): string {
  const amount = Math.min(1, Math.max(0, ratio));
  const [r1, g1, b1] = channels(color);
  const [r2, g2, b2] = channels(over);

  const mix = (a: number, b: number) =>
    Math.round(a * amount + b * (1 - amount))
      .toString(16)
      .padStart(2, '0');

  return `#${mix(r1, r2)}${mix(g1, g2)}${mix(b1, b2)}`;
}
