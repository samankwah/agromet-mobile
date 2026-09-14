/** A viridis-like purple→blue→teal→green→yellow scale, matching the
 * reference screenshots' legend. Hand-rolled (5 stops, linear RGB
 * interpolation) rather than a color-scale library — this is the only
 * place in the app that needs one.
 *
 * Exported so the MapLibre layer can build its own `interpolate` ramp from
 * these exact stops — the map and the legend must never drift apart. */
export type ColorStops = [number, [number, number, number]][];

export const VIRIDIS_STOPS: ColorStops = [
  [0, [68, 1, 84]],
  [0.25, [59, 82, 139]],
  [0.5, [33, 145, 140]],
  [0.75, [94, 201, 98]],
  [1, [253, 231, 37]],
];

/**
 * Sequential ramps for the deterministic view, one per variable.
 *
 * Viridis is the right default for an unfamiliar quantity, but using it for
 * both rainfall and temperature makes two different maps look identical: a
 * reader glancing at the screen cannot tell millimetres from degrees, and the
 * only cue is a unit in the legend. Published forecast maps solve this with
 * convention -- water runs pale to blue, heat runs pale to red -- so a met
 * reader knows which quantity they are looking at before reading a label.
 *
 * Both are ColorBrewer sequential schemes (YlGnBu and YlOrRd), chosen for the
 * same reason the tercile palettes are BrBG and RdBu: they stay ordered in
 * greyscale and for the common colour deficiencies.
 */
export const RAINFALL_STOPS: ColorStops = [
  [0, [255, 255, 204]],
  [0.25, [161, 218, 180]],
  [0.5, [65, 182, 196]],
  [0.75, [44, 127, 184]],
  [1, [37, 52, 148]],
];

export const TEMPERATURE_STOPS: ColorStops = [
  [0, [255, 255, 178]],
  [0.25, [254, 204, 92]],
  [0.5, [253, 141, 60]],
  [0.75, [240, 59, 32]],
  [1, [189, 0, 38]],
];

/**
 * The rain-rate ramp NASA GIBS bakes into its IMERG tiles, sampled from the
 * live tiles themselves.
 *
 * We match GIBS rather than fight it. The satellite half of the precipitation
 * map is imagery with its palette already burned in, so the only ways to make
 * the two halves agree are to recolour the raster (`raster-hue-rotate` produces
 * colours no legend can honestly describe) or to paint our own half in GIBS's
 * colours. The second is the honest one: a single key then describes the whole
 * timeline, and the only thing that changes across the seam is resolution,
 * which is real and is said out loud in the caption.
 *
 * GIBS's full colormap also carries a blue-through-purple branch. That is
 * frozen precipitation, which at Ghana's latitudes never appears, so only the
 * rain branch is reproduced here.
 */
export const IMERG_STOPS: ColorStops = [
  [0, [0, 126, 69]],
  [0.2, [3, 167, 0]],
  [0.4, [143, 214, 0]],
  [0.6, [253, 202, 0]],
  [0.8, [255, 95, 37]],
  [1, [225, 0, 0]],
];

/**
 * Class boundaries for rain rate, in mm/h.
 *
 * Fixed and absolute, never derived from the frame's own min and max. A
 * data-driven domain is the natural habit here (`deterministicRange` in
 * subseasonal/cells.ts does exactly that, correctly, for a static map) and it
 * would be a bug on an animation: a colour would mean a different rate in every
 * frame, so a cell whose rainfall never changed would appear to change as the
 * loop ran.
 *
 * Unequal, because rain rate is strongly non-linear. Equal intervals over
 * 0 to 20 mm/h put nearly all of Ghana in the first class on nearly every day.
 */
export const PRECIP_RATE_BREAKS = [0.1, 0.5, 1, 2, 5, 10, 20];

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** t in [0,1] -> an rgb() color string. */
export function interpolateViridis(t: number, stops: ColorStops = VIRIDIS_STOPS): string {
  const clamped = Math.min(Math.max(t, 0), 1);

  for (let i = 0; i < stops.length - 1; i += 1) {
    const [stopStart, colorStart] = stops[i];
    const [stopEnd, colorEnd] = stops[i + 1];
    if (clamped >= stopStart && clamped <= stopEnd) {
      const localT = (clamped - stopStart) / (stopEnd - stopStart);
      const r = Math.round(lerp(colorStart[0], colorEnd[0], localT));
      const g = Math.round(lerp(colorStart[1], colorEnd[1], localT));
      const b = Math.round(lerp(colorStart[2], colorEnd[2], localT));
      return `rgb(${r}, ${g}, ${b})`;
    }
  }

  const [, lastColor] = stops[stops.length - 1];
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

export function buildColorClasses(
  min: number,
  max: number,
  classCount: number = DEFAULT_CLASS_COUNT,
  stops: ColorStops = VIRIDIS_STOPS,
): ColorClass[] {
  // A flat dataset has no range to divide — one class covering everything
  // is the honest representation, rather than inventing fake breaks.
  if (max === min) return [{ from: min, to: max, color: interpolateViridis(0.5, stops) }];

  const width = (max - min) / classCount;
  return Array.from({ length: classCount }, (_, index) => ({
    from: min + index * width,
    to: index === classCount - 1 ? max : min + (index + 1) * width,
    // Sample at the class midpoint so each block gets a colour that
    // represents its whole range, rather than its edge.
    color: interpolateViridis((index + 0.5) / classCount, stops),
  }));
}

/**
 * Classes from explicit boundaries rather than from an equal division of a
 * range — the counterpart to `buildColorClasses` for a quantity with published
 * breaks of its own, like rain rate.
 *
 * `breaks` are the inclusive lower bounds. The final class is open ended, so
 * its `to` is `Infinity`: there is no upper limit on how hard it can rain, and
 * inventing one would put a ceiling on the map that the data does not have.
 *
 * Like `buildColorClasses`, this is the single source of the classing — the
 * legend and the map fill both derive from it, so they cannot disagree.
 */
export function buildFixedClasses(breaks: number[], stops: ColorStops): ColorClass[] {
  return breaks.map((from, index) => ({
    from,
    to: index === breaks.length - 1 ? Infinity : breaks[index + 1],
    // Sample at the class midpoint, so a block's colour represents its whole
    // range rather than its edge.
    color: interpolateViridis((index + 0.5) / breaks.length, stops),
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
export const TERCILE_CATEGORIES: { label: string; color: string; sublabel?: string }[] = [
  { label: 'Below Normal', color: 'rgb(194, 112, 61)' },
  { label: 'Normal', color: 'rgb(154, 165, 171)' },
  { label: 'Above Normal', color: 'rgb(43, 122, 120)' },
];

/** The class a value falls into — used by the offline SVG renderer so it
 * bins identically to the MapLibre layer. */
export function valueToClassColor(
  value: number,
  min: number,
  max: number,
  classCount: number = DEFAULT_CLASS_COUNT,
  stops: ColorStops = VIRIDIS_STOPS,
): string {
  const classes = buildColorClasses(min, max, classCount, stops);
  const match = classes.find((entry, index) => (index === classes.length - 1 ? value <= entry.to : value < entry.to));
  return (match ?? classes[classes.length - 1]).color;
}
