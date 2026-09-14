import type { Ionicons } from '@expo/vector-icons';

import type { Theme } from '../theme/ThemeProvider';
import type { AlertSeverity } from './alertSeverity';

/**
 * The severity bands the flood/drought index is reported in.
 *
 * Deliberately a separate type from `AlertSeverity`, despite the overlapping
 * words. They are different things:
 *
 *   - `AlertSeverity` is a CAP alert level — a discrete, published, expiring
 *     warning about a specific hazard in a specific district.
 *   - `HazardBand` is a bucket of a continuous 0-100 index, computed for every
 *     region every day, whether or not anything is wrong.
 *
 * Collapsing them would mean either losing a band or breaking the CAP
 * alignment `alertSeverity.ts` was built for. They meet at exactly one place:
 * `alertSeverityForBand`, used when the index is severe enough to be worth
 * raising as an alert.
 *
 * **The overlap is the trap.** `normal` and `watch` are members of both unions
 * with different meanings — hazard band `watch` (score 25+) is NOT alert
 * severity `watch`, which comes from band `moderate`. Name every variable
 * holding one of these `band` or `severity` accordingly, never loosely.
 *
 * Bands mirror `SEVERITY_BANDS` in `backend/app/hazards.py`, plus the
 * `unavailable` that `band_for(None)` returns for a region with no reading.
 */
export type HazardBand = 'unavailable' | 'normal' | 'watch' | 'moderate' | 'severe' | 'extreme';

/** Least to most severe. `unavailable` sorts below everything: it is an absence
 * of information, not a reassurance. */
export const HAZARD_BAND_ORDER: HazardBand[] = ['unavailable', 'normal', 'watch', 'moderate', 'severe', 'extreme'];

/**
 * The inclusive score each band starts at, mirroring `SEVERITY_BANDS` in
 * `backend/app/hazards.py`. A band runs up to the next band's minimum, so every
 * real band is twenty points wide.
 *
 * `unavailable` is 0 rather than absent so callers can index without a guard —
 * a region with no reading has no score to compare anyway.
 *
 * Restated here rather than read from `/api/hazards/methodology` because
 * `hazardAlerts.ts` derives CAP certainty from how deep a score sits in its
 * band, and that derivation must work from a cached snapshot with no
 * methodology call behind it. If the backend ever moves a threshold, this is
 * the second place to change.
 */
export const HAZARD_BAND_MIN_SCORE: Record<HazardBand, number> = {
  unavailable: 0,
  normal: 0,
  watch: 25,
  moderate: 45,
  severe: 65,
  extreme: 85,
};

export type HazardBandMeta = {
  band: HazardBand;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  /** Filled segments out of five, and how heavily the band paints on the map.
   * A second, non-hue channel for severity, so the ordering survives greyscale
   * and colour-blindness. */
  steps: number;
  fillRatio: number;
  a11yLabel: string;
};

const BAND_META: Record<HazardBand, HazardBandMeta> = {
  unavailable: {
    band: 'unavailable',
    label: 'No data',
    description: 'No reading is available for this region',
    icon: 'help-circle',
    steps: 0,
    fillRatio: 0.12,
    a11yLabel: 'No data for this region',
  },
  normal: {
    band: 'normal',
    label: 'Normal',
    description: 'Within the usual range for this time of year',
    icon: 'checkmark-circle',
    steps: 1,
    fillRatio: 0.16,
    a11yLabel: 'Normal, within the usual range',
  },
  watch: {
    band: 'watch',
    label: 'Watch',
    description: 'Slightly outside the usual range, worth keeping an eye on',
    icon: 'eye',
    steps: 2,
    fillRatio: 0.3,
    a11yLabel: 'Watch, slightly outside the usual range',
  },
  moderate: {
    band: 'moderate',
    label: 'Moderate',
    description: 'Clearly outside the usual range, so start preparing',
    icon: 'alert',
    steps: 3,
    fillRatio: 0.42,
    a11yLabel: 'Moderate risk, start preparing',
  },
  severe: {
    band: 'severe',
    label: 'Severe',
    description: 'Well outside the usual range, act now',
    icon: 'warning',
    steps: 4,
    fillRatio: 0.55,
    a11yLabel: 'Severe risk, act now',
  },
  extreme: {
    band: 'extreme',
    label: 'Extreme',
    description: 'Among the most extreme conditions on record for the time of year',
    icon: 'alert-circle',
    steps: 5,
    fillRatio: 0.72,
    a11yLabel: 'Extreme risk, follow official instructions',
  },
};

/**
 * Pure lookup — the single place a band becomes a label, icon and weight.
 *
 * Unlike `getSeverityMeta`, this does NOT throw on an unrecognised value.
 * Severities are constructed inside the app, so an unknown one is a programming
 * error worth failing loudly on. Bands arrive from a network payload this app
 * does not control, and a backend that adds a seventh band should degrade to a
 * readable screen rather than a white one.
 *
 * The fallback is `unavailable`, never `normal`. Reporting "Normal" for
 * something we failed to understand would be a false reassurance on a page
 * about flooding.
 */
export function getHazardBandMeta(band: string | null | undefined): HazardBandMeta {
  const meta = BAND_META[band as HazardBand];
  if (meta) return meta;

  if (__DEV__ && band) {
    console.warn(`getHazardBandMeta: unrecognised band "${band}" — treating as no data`);
  }
  return BAND_META.unavailable;
}

/**
 * Band colour, resolved against the theme.
 *
 * Five distinct hues rather than four plus an opacity step. Mobile has a deeper
 * amber (`severityColors.warning`) sitting between the alert amber and the
 * emergency red, so `moderate` and `severe` can be told apart by hue — which
 * reads far better on a phone than a fill-opacity difference does.
 *
 * `normal` is a neutral grey on purpose: nothing to report should look like
 * nothing, so the eye lands on the one or two regions that are not normal.
 */
export function hazardBandColor(band: string | null | undefined, theme: Theme): string {
  switch (getHazardBandMeta(band).band) {
    case 'normal':
      return theme.colors.muted;
    case 'watch':
      return theme.colors.teal;
    case 'moderate':
      return theme.severityColors.watch;
    case 'severe':
      return theme.severityColors.warning;
    case 'extreme':
      return theme.severityColors.emergency;
    default:
      return theme.colors.border;
  }
}

export function hazardBandRank(band: string | null | undefined): number {
  return HAZARD_BAND_ORDER.indexOf(getHazardBandMeta(band).band);
}

/** Worst first, for ranking regions. */
export function compareBandDesc(a: string, b: string): number {
  return hazardBandRank(b) - hazardBandRank(a);
}

/** Bands at or above `moderate` are the ones worth a reader's attention. This
 * matches the backend's own `elevated()` count and the "Moderate or above"
 * label on the web tiles. */
export function isElevatedBand(band: string | null | undefined): boolean {
  return hazardBandRank(band) >= hazardBandRank('moderate');
}

/**
 * The one crossing point between the index and the alert system.
 *
 * `null` means "do not raise an alert", and three bands return it:
 *
 *   - `unavailable` — we do not know, and claiming anything would be a lie.
 *   - `normal` — the backend publishes no advisories at this band; there is
 *     nothing to say.
 *   - `watch` — the ordinary state of much of the country in the rainy season.
 *     Emitting here would light the banner permanently, and a banner that is
 *     always on is furniture rather than a warning. Moderate-and-above is also
 *     the backend's own definition of "needs attention".
 */
export function alertSeverityForBand(band: string | null | undefined): AlertSeverity | null {
  switch (getHazardBandMeta(band).band) {
    case 'moderate':
      return 'watch';
    case 'severe':
      return 'warning';
    case 'extreme':
      return 'emergency';
    default:
      return null;
  }
}
