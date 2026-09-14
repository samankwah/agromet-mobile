import type { DiagnosisConfidenceBand } from '../domain/diagnosis';

/**
 * The lowest score the server will report at all.
 *
 * Mirrors `MIN_REPORTABLE_CONFIDENCE` in `backend/app/diagnosis.py`: below it
 * the provider is guessing and the response comes back `status: "unavailable"`
 * instead of a diagnosis. The lowest bucket here has to start on exactly that
 * number, otherwise the key and the gate would describe different things.
 */
const MIN_REPORTABLE = 45;

/** Above this the provider is not merely leaning, it has a clear answer. */
const HIGH_CONFIDENCE = 70;

export type ConfidenceBucket = {
  band: DiagnosisConfidenceBand;
  /** The bucket the score fell in, not a confidence interval. See below. */
  range: [number, number];
};

/**
 * A single model score, reported as the band it falls in.
 *
 * The domain rule is that a result never shows a point value, because a
 * classifier's score is not precise enough to deserve one. The tempting fix is
 * to pad the number into a range (62% becomes "55 to 70%"), but that invents an
 * interval nobody computed and quietly claims a calibration this model has
 * never been checked for.
 *
 * So the range here is the *bucket boundary*, and the sentence it stands for is
 * simply "the score landed in this band". That is a true statement about a
 * number we actually have, which the padded version is not.
 */
export function confidenceBucket(confidence: number): ConfidenceBucket {
  // Compared as the raw fraction, not a rounded percent. Rounding first would
  // put 0.699 in the high band because it displays as "70", and since the point
  // value is never shown there is nothing to round for.
  const pct = confidence * 100;

  if (pct >= HIGH_CONFIDENCE) {
    return { band: 'high', range: [HIGH_CONFIDENCE, 100] };
  }
  // Anything the server sent is at or above the reportable floor, so a score
  // under it can only mean the two thresholds have drifted apart. Report the
  // floor rather than inventing a band beneath it.
  return { band: 'moderate', range: [MIN_REPORTABLE, HIGH_CONFIDENCE] };
}
