/**
 * Crop diagnosis types. `DiagnosisRequest` in, `DiagnosisResult` or
 * `DiagnosisUnavailable` out, is the entire contract
 * shared/api/diagnosisService.ts commits to; no UI component talks to the
 * endpoint directly.
 */
export type DiagnosisRequest = {
  crop: string;
  growthStage: string;
  /** The farmer's own note. Travels with the record and is shown back to them,
   * but the classifier reads the photo, not this. */
  symptoms: string;
  /** Local file URI of the already-compressed photo. Required in practice: the
   * provider classifies the image, so there is no diagnosis without one. Kept
   * optional in the type because a queued submission can outlive its file. */
  imageUri?: string;
  /** The farmer's region, for the record and for provider context. */
  region?: string;
};

export type DiagnosisConfidenceBand = 'low' | 'moderate' | 'high';

/**
 * No answer, and why.
 *
 * A distinct type rather than a `DiagnosisResult` with empty fields, so the
 * screen cannot render "no verified diagnosis" through the result card and
 * have it read like a finding.
 */
export type DiagnosisUnavailable = {
  status: 'unavailable';
  reason: string;
};

export type DiagnosisResult = {
  id: string;
  likelyIssue: string;
  /** What the provider decided the plant was, which is not always the crop the
   * farmer picked. Worth showing: a maize answer on a cassava photo is the
   * clearest possible signal that the result should be distrusted. */
  plant: string;
  confidenceBand: DiagnosisConfidenceBand;
  /** The band's own boundaries, not a confidence interval. See
   * utils/confidenceBucket.ts for why a padded range would be a lie. */
  confidenceRangePct: [number, number];
  immediateActions: string[];
  preventionGuidance: string[];
  /** The provider's advice as one piece. Shown when the structured split came
   * back empty, which happens when the provider sends prose. */
  remedy: string;
  /** The symptoms the provider says it saw, which is not the same as the
   * symptoms the farmer typed. */
  evidence: string[];
  /** The photo this answer was drawn from. */
  imageUri?: string;
  /** The farmer's own note, carried through so the record is complete. */
  symptoms?: string;
  disclaimer: string;
  diagnosedAt: string; // ISO 8601
  /**
   * Which engine answered.
   *
   * The two are not equally capable: `provider` is a commercial API covering
   * two dozen crops, `offline-model` is a five-class cassava model running on
   * the phone with no network. They produce the same shape so the screen can
   * render either, which is exactly why the difference has to be carried
   * explicitly rather than inferred, and shown to the farmer rather than kept
   * as an implementation detail.
   *
   * Optional so that records written before the offline path existed still
   * parse; absent means `provider`.
   */
  source?: DiagnosisSource;
};

export type DiagnosisSource = 'provider' | 'offline-model';

export function isDiagnosisUnavailable(value: DiagnosisResult | DiagnosisUnavailable): value is DiagnosisUnavailable {
  return 'status' in value && value.status === 'unavailable';
}

/** A submission waiting to sync because the device was offline when the farmer
 * submitted it, or the request failed. */
export type QueuedDiagnosisSubmission = {
  localId: string;
  request: DiagnosisRequest;
  queuedAt: string; // ISO 8601
  /** `abandoned` is terminal: the retry cap was reached. It is counted and
   * stated rather than retried forever behind a badge that never clears. */
  status: 'pending' | 'syncing' | 'failed' | 'abandoned';
  attempts: number;
};
