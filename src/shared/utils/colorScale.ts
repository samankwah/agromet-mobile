/** A viridis-like purple→blue→teal→green→yellow scale, matching the
 * reference screenshots' legend. Hand-rolled (5 stops, linear RGB
 * interpolation) rather than a color-scale library — this is the only
 * place in the app that needs one.
 *
 * Exported so the MapLibre layer can build its own `interpolate` ramp from
 * these exact stops — the map and the legend must never drift apart. */
export const VIRIDIS_STOPS: [number, [number, number, number]][] = [
  [0, [68, 1, 84]],
  [0.25, [59, 82, 139]],
  [0.5, [33, 145, 140]],
  [0.75, [94, 201, 98]],
  [1, [253, 231, 37]],
];

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** t in [0,1] -> an rgb() color string. */
export function interpolateViridis(t: number): string {
  const clamped = Math.min(Math.max(t, 0), 1);

  for (let i = 0; i < VIRIDIS_STOPS.length - 1; i += 1) {
    const [stopStart, colorStart] = VIRIDIS_STOPS[i];
    const [stopEnd, colorEnd] = VIRIDIS_STOPS[i + 1];
    if (clamped >= stopStart && clamped <= stopEnd) {
      const localT = (clamped - stopStart) / (stopEnd - stopStart);
      const r = Math.round(lerp(colorStart[0], colorEnd[0], localT));
      const g = Math.round(lerp(colorStart[1], colorEnd[1], localT));
      const b = Math.round(lerp(colorStart[2], colorEnd[2], localT));
      return `rgb(${r}, ${g}, ${b})`;
    }
  }

  const [, lastColor] = VIRIDIS_STOPS[VIRIDIS_STOPS.length - 1];
  return `rgb(${lastColor[0]}, ${lastColor[1]}, ${lastColor[2]})`;
}

/** Maps a raw value within [min, max] onto the viridis scale — guards
 * divide-by-zero when min === max by returning the scale's midpoint. */
export function valueToViridis(value: number, min: number, max: number): string {
  if (max === min) return interpolateViridis(0.5);
  return interpolateViridis((value - min) / (max - min));
}

/**
 * Discrete classes, not a continuous ramp.
 *
 * A smooth gradient is effectively unreadable on a choropleth — you can't
 * match a shade on the map back to a number on the legend. Equal-interval
 * classes let a farmer do exactly that: find the block, read the range.
 * Six is the usual readability ceiling before adjacent classes stop being
 * distinguishable.
 *
 * This is the single source of the classing: the legend, the MapLibre fill
 * and the offline SVG renderer all derive from it, so the colours on the
 * map always mean what the legend says they mean.
 */
export const DEFAULT_CLASS_COUNT = 6;

export type ColorClass = {
  /** Inclusive lower bound. */
  from: number;
  /** Exclusive upper bound, except the final class which is inclusive. */
  to: number;
  color: string;
};

export function buildColorClasses(min: number, max: number, classCount: number = DEFAULT_CLASS_COUNT): ColorClass[] {
  // A flat dataset has no range to divide — one class covering everything
  // is the honest representation, rather than inventing fake breaks.
  if (max === min) return [{ from: min, to: max, color: interpolateViridis(0.5) }];

  const width = (max - min) / classCount;
  return Array.from({ length: classCount }, (_, index) => ({
    from: min + index * width,
    to: index === classCount - 1 ? max : min + (index + 1) * width,
    // Sample at the class midpoint so each block gets a colour that
    // represents its whole range, rather than its edge.
    color: interpolateViridis((index + 0.5) / classCount),
  }));
}

/**
 * Probabilistic seasonal forecasts are published as terciles, not as a
 * continuous quantity — "above normal rainfall is most likely" rather
 * than "612mm". So the Probability view renders three named categories
 * instead of a numeric ramp.
 *
 * Index order is meaningful (0 = below, 1 = normal, 2 = above) and is what
 * the mock/service writes into `cell.value` in that mode.
 *
 * The palette is a neutral ordered diverging scheme rather than the
 * wet-blue/dry-brown convention, because the "good" direction flips by
 * variable — above-normal rainfall is favourable, above-normal dry-spell
 * length is not. Letting the label carry the meaning avoids the map
 * implying a judgement the data doesn't support.
 */
export const TERCILE_CATEGORIES: { label: string; color: string }[] = [
  { label: 'Below Normal', color: 'rgb(194, 112, 61)' },
  { label: 'Normal', color: 'rgb(154, 165, 171)' },
  { label: 'Above Normal', color: 'rgb(43, 122, 120)' },
];

/** The class a value falls into — used by the offline SVG renderer so it
 * bins identically to the MapLibre layer. */
export function valueToClassColor(value: number, min: number, max: number, classCount: number = DEFAULT_CLASS_COUNT): string {
  const classes = buildColorClasses(min, max, classCount);
  const match = classes.find((entry, index) => (index === classes.length - 1 ? value <= entry.to : value < entry.to));
  return (match ?? classes[classes.length - 1]).color;
}
