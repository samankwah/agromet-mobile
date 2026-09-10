import type { DiagnosisRequest, DiagnosisResult, DiagnosisUnavailable } from '../../../../shared/domain/diagnosis';
import { confidenceBucket } from '../../../../shared/utils/confidenceBucket';
import { classifyImage, isLocalModelSupported, type Prediction } from './classifier';
import { CASSAVA_KNOWLEDGE_BASE } from './knowledgeBase';
import { MIN_REPORTABLE_CONFIDENCE } from './labels';

/**
 * The model's index and score, as the same `DiagnosisResult` the online path
 * produces.
 *
 * Producing the identical shape is deliberate: `DiagnoseScreen` and
 * `DiagnosisResultCard` render an answer without knowing where it came from, and
 * history stores both alike. The one thing that must differ is the label saying
 * which engine answered, because the two are not equally capable and the farmer
 * is entitled to know which one they are reading.
 */

/**
 * The only crop the bundled model knows.
 *
 * Feeding it a maize leaf does not produce an error, it produces a cassava
 * disease name with a confident-looking score attached. So the crop is checked
 * before the model runs, not after.
 */
const SUPPORTED_CROP = 'cassava';

const OFFLINE_DISCLAIMER =
  'Answered on your phone with no internet, using a model trained on cassava only. It is decision support, not a verified diagnosis. Confirm with an agricultural extension officer before spending money on treatment.';

export function isCropSupportedOffline(crop: string | undefined): boolean {
  return (crop ?? '').trim().toLowerCase() === SUPPORTED_CROP;
}

/**
 * A prediction into a result, or into an honest refusal.
 *
 * Exported separately from `diagnoseOffline` so the gating can be tested
 * without a native model in the way.
 */
export function adaptPrediction(
  prediction: Prediction,
  request: DiagnosisRequest,
): DiagnosisResult | DiagnosisUnavailable {
  // Below the floor the model is guessing between classes it cannot separate.
  // The online provider refuses to answer at exactly this point
  // (MIN_REPORTABLE_CONFIDENCE in backend/app/diagnosis.py), and a weaker model
  // has less licence to guess, not more.
  if (prediction.confidence < MIN_REPORTABLE_CONFIDENCE) {
    return {
      status: 'unavailable',
      reason:
        'The offline check could not identify this with enough confidence to report. Try another photo in better light, or show the plant to an extension officer.',
    };
  }

  const info = CASSAVA_KNOWLEDGE_BASE[prediction.classId];
  const { band, range } = confidenceBucket(prediction.confidence);

  return {
    id: `${prediction.classId}-${Date.now()}`,
    likelyIssue: info.displayName,
    // Not what the model decided the plant was, but what the farmer told us.
    // A single-crop classifier has no opinion on species: it maps any image to
    // one of five cassava classes, so reporting "Cassava" as a finding would be
    // claiming an identification that never happened.
    plant: 'Cassava',
    confidenceBand: band,
    confidenceRangePct: range,
    immediateActions: info.immediateActions,
    preventionGuidance: info.preventionGuidance,
    remedy: info.summary,
    // Left empty on purpose. The online provider returns the symptoms it says
    // it observed; a convolutional classifier returns a score and nothing else.
    // Listing this disease's textbook symptoms here would read as "the model saw
    // these", which is a claim the model cannot support.
    evidence: [],
    imageUri: request.imageUri,
    symptoms: request.symptoms,
    disclaimer: OFFLINE_DISCLAIMER,
    diagnosedAt: new Date().toISOString(),
    source: 'offline-model',
  };
}

/**
 * Diagnose without a network. Returns `DiagnosisUnavailable` rather than
 * throwing, because every caller is a fallback path that has already lost its
 * first choice and needs something to show the farmer.
 */
export async function diagnoseOffline(request: DiagnosisRequest): Promise<DiagnosisResult | DiagnosisUnavailable> {
  if (!request.imageUri) {
    return { status: 'unavailable', reason: 'A photo is needed to identify a crop problem.' };
  }

  if (!isCropSupportedOffline(request.crop)) {
    return {
      status: 'unavailable',
      reason: `The offline check only covers cassava. Your ${request.crop} photo will be sent for a full diagnosis when you are back online.`,
    };
  }

  // Expo Go, or any build without the native module compiled in. Distinguished
  // from a model that failed to load because the answer is different: nothing
  // about this photo or this phone will change it, only a different build will.
  if (!isLocalModelSupported()) {
    return {
      status: 'unavailable',
      reason: 'This version of the app cannot check crops offline. Your photo will be sent for diagnosis when you are back online.',
    };
  }

  try {
    return adaptPrediction(await classifyImage(request.imageUri), request);
  } catch {
    // A missing model asset, a photo the decoder rejected, a device that could
    // not allocate the graph. The farmer does not need to know which; they need
    // to know they have no answer yet and their photo is not lost.
    return {
      status: 'unavailable',
      reason: 'The offline check could not run on this device. Your photo will be sent for diagnosis when you are back online.',
    };
  }
}
