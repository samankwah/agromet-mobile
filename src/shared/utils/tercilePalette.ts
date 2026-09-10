import type { SubseasonalVariable, TercileCategory } from '../domain/subseasonalOutlook';

/**
 * Tercile palettes for a probability map, one per variable.
 *
 * Rainfall and temperature have different published conventions and a met
 * reader knows both on sight: rainfall runs brown for dry to blue-green for wet,
 * temperature runs blue for cool to red for warm. Colouring them identically
 * would make a hot fortnight and a wet one look the same.
 *
 * The ramps are ColorBrewer's **BrBG** and **RdBu** at five classes, which is
 * what IRI and WMO tercile products use. Both are colourblind-safe at this class
 * count, which a bare red/green pairing would not be.
 *
 * Distinct from `TERCILE_CATEGORIES` in `colorScale.ts`, which stays neutral and
 * is still what the Seasonal map uses. That view carries variables like dry-spell
 * length where "above" is not a direction with an agreed colour, and its own
 * docblock explains why it refuses to imply one. Rainfall and temperature do have
 * agreed colours, so this map uses them.
 */

/**
 * Depth carries strength, so the map distinguishes a forecast from a shrug.
 *
 * A three-way split floors at about 33%: that is climatology. A winning share
 * under half is barely a lean, and is rendered as no signal rather than given a
 * colour that would imply a finding — this month's live run has three regions in
 * that state. Seventy percent is where a majority becomes decisive enough to act
 * on.
 */
export const SIGNAL_MODERATE_SHARE = 0.5;
export const SIGNAL_STRONG_SHARE = 0.7;

/** Index order is the contract with `ChoroplethMap`, which looks the colour up
 * by `cell.value`. Ordered driest/coolest to wettest/warmest. */
export const BAND_COUNT = 5;

export type TercileBand = 0 | 1 | 2 | 3 | 4;

/** A neutral grey for the middle, rather than ColorBrewer's near-white: this map
 * is rendered in dark mode as often as light, and #f7f7f7 glares in one and
 * disappears in the other. */
const NO_SIGNAL = 'rgb(154, 165, 171)';

export type TercilePalette = { label: string; color: string; sublabel?: string }[];

/**
 * The share each band covers, written from the thresholds rather than typed out.
 *
 * The legend used to name the bands without saying where they cut, which left a
 * reader unable to tell a 51% lean from a 95% one. Deriving the text from
 * `SIGNAL_MODERATE_SHARE` and `SIGNAL_STRONG_SHARE` is what stops the key
 * drifting from `bandFor` the first time anyone tunes them.
 */
const pct = (share: number) => `${Math.round(share * 100)}%`;

const STRONG_LABEL = `${pct(SIGNAL_STRONG_SHARE)}+`;
const MODERATE_LABEL = `${pct(SIGNAL_MODERATE_SHARE)}-${pct(SIGNAL_STRONG_SHARE)}`;
const NEUTRAL_LABEL = `under ${pct(SIGNAL_MODERATE_SHARE)}`;

/** ColorBrewer BrBG-5: the precipitation convention, dry brown to wet teal. */
/**
 * The share at each boundary between bands, left to right, for a stepped key.
 *
 * Six edges for five blocks, exactly as the continuous legend labels its
 * classes: a number on the line between two colours reads unambiguously, where
 * a number floating over a block's middle does not say which side it belongs
 * to. Runs 100 -> 70 -> 50 at the drier end, mirrors back out through the
 * neutral middle, because both outer bands mean "strong" and both inner ones
 * "moderate" -- the direction is the colour's job, not the number's.
 *
 * Derived from the same two constants `bandFor` bins on, so the key cannot
 * drift from the map the first time anyone tunes them.
 */
export const TERCILE_BOUNDS: string[] = [
  '100%',
  pct(SIGNAL_STRONG_SHARE),
  pct(SIGNAL_MODERATE_SHARE),
  pct(SIGNAL_MODERATE_SHARE),
  pct(SIGNAL_STRONG_SHARE),
  '100%',
];

export const RAINFALL_PALETTE: TercilePalette = [
  { label: 'Much drier', color: 'rgb(166, 97, 26)', sublabel: STRONG_LABEL },
  { label: 'Drier', color: 'rgb(223, 194, 125)', sublabel: MODERATE_LABEL },
  { label: 'No signal', color: NO_SIGNAL, sublabel: NEUTRAL_LABEL },
  { label: 'Wetter', color: 'rgb(128, 205, 193)', sublabel: MODERATE_LABEL },
  { label: 'Much wetter', color: 'rgb(1, 133, 113)', sublabel: STRONG_LABEL },
];

/** ColorBrewer RdBu-5 reversed: the temperature convention, cool blue to warm red. */
export const TEMPERATURE_PALETTE: TercilePalette = [
  { label: 'Much cooler', color: 'rgb(5, 113, 176)', sublabel: STRONG_LABEL },
  { label: 'Cooler', color: 'rgb(146, 197, 222)', sublabel: MODERATE_LABEL },
  { label: 'No signal', color: NO_SIGNAL, sublabel: NEUTRAL_LABEL },
  { label: 'Warmer', color: 'rgb(244, 165, 130)', sublabel: MODERATE_LABEL },
  { label: 'Much warmer', color: 'rgb(202, 0, 32)', sublabel: STRONG_LABEL },
];

export function paletteFor(variable: 'rainfall' | 'temperature'): TercilePalette {
  return variable === 'rainfall' ? RAINFALL_PALETTE : TEMPERATURE_PALETTE;
}

/**
 * Which of the five bands a reading falls into.
 *
 * `normal` winning is not the same as no signal — it means the ensemble actively
 * favours the middle third — but both sit in the neutral band, because a map has
 * no third colour to distinguish them with and the drawer's text does say which
 * it is.
 */
export function bandFor(reading: SubseasonalVariable): TercileBand {
  // No baseline for this cell, so there is no split to band. Neutral is the
  // honest answer; the deterministic view still has something to say about it.
  if (!reading.probabilities || !reading.category) return 2;
  if (reading.noSignal) return 2;

  const share = reading.probabilities[reading.category];
  if (share < SIGNAL_MODERATE_SHARE) return 2;

  const strong = share >= SIGNAL_STRONG_SHARE;
  return bandForCategory(reading.category, strong);
}

function bandForCategory(category: TercileCategory, strong: boolean): TercileBand {
  if (category === 'below') return strong ? 0 : 1;
  if (category === 'above') return strong ? 4 : 3;
  return 2;
}
