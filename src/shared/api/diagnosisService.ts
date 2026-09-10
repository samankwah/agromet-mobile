import { File } from 'expo-file-system';

import type { DiagnosisRequest, DiagnosisResult, DiagnosisUnavailable } from '../domain/diagnosis';
import { confidenceBucket } from '../utils/confidenceBucket';
import { postJson } from './http';

/**
 * Sole swap point for crop diagnosis. `DiagnosisRequest` in, a result or a
 * plain "no answer" out. No UI component calls the endpoint directly;
 * `useDiagnose.ts` is the only caller.
 *
 * Talks to the backend's Kindwise integration at POST /api/crop-diagnosis
 * (backend/app/diagnosis.py), which classifies the *photo*. The symptoms the
 * farmer typed travel with the request and stay attached to the record, but
 * they are not read by the model, and nothing in the UI may imply they were.
 */

/**
 * Kindwise plus a leaf photo is slower than the 10s default budget allows.
 *
 * This has to stay ABOVE the backend's own provider timeout, which is 45s
 * (`timeout: float = 45.0` in backend/app/diagnosis.py). At the previous 30s
 * the app gave up 15 seconds before the backend did, so a provider that took
 * between 30 and 45 seconds produced an answer the backend was ready to return
 * and the app had already thrown away. The abort surfaces as a transport
 * failure, which `useDiagnose` treats as "could not reach the server" and
 * queues under "You are offline" even though the farmer is online.
 *
 * The five second margin over 45s covers the request and response round trip
 * either side of the provider call. If the backend's timeout changes, this has
 * to move with it.
 */
const DIAGNOSIS_TIMEOUT_MS = 50_000;

type DiagnosisDto = {
  status: string;
  isAvailable: boolean;
  plant: string;
  disease: string;
  remedy: string;
  treatmentParts?: { immediate?: string[]; prevention?: string[] };
  confidence: number | null;
  evidence?: string[];
  notes?: string[];
  disclaimer: string;
};

export async function submitDiagnosis(request: DiagnosisRequest): Promise<DiagnosisResult | DiagnosisUnavailable> {
  // The photo is the input the classifier actually reads, so there is nothing
  // to ask without one. The screen enforces this too; the guard here is what
  // makes the service honest on its own.
  if (!request.imageUri) {
    return {
      status: 'unavailable',
      reason: 'A photo is needed to identify a crop problem.',
    };
  }

  const image = await new File(request.imageUri).base64();

  const dto = await postJson<DiagnosisDto>(
    '/api/crop-diagnosis',
    {
      image,
      crop: request.crop,
      region: request.region,
      context: { symptoms: request.symptoms, growthStage: request.growthStage },
    },
    { timeoutMs: DIAGNOSIS_TIMEOUT_MS },
  );

  return adaptDiagnosis(dto, request);
}

/**
 * The server's shape into the app's.
 *
 * Exported for tests: this is where a provider change would first show up, and
 * pinning it against a captured response is cheaper than discovering the drift
 * on a farmer's phone.
 */
export function adaptDiagnosis(dto: DiagnosisDto, request: DiagnosisRequest): DiagnosisResult | DiagnosisUnavailable {
  // Three real causes: the score was too low to report, no provider key is
  // configured, or the photo is not a plant. None of them is a diagnosis, and
  // dressing any of them as one is the failure this branch exists to prevent.
  if (dto.status !== 'ok' || dto.confidence === null) {
    return { status: 'unavailable', reason: dto.remedy };
  }

  const { band, range } = confidenceBucket(dto.confidence);
  const parts = dto.treatmentParts ?? {};

  return {
    id: `${dto.disease}-${Date.now()}`,
    likelyIssue: dto.disease,
    plant: dto.plant,
    confidenceBand: band,
    confidenceRangePct: range,
    // Never split the prose blob in `remedy` on full stops to fake a list: the
    // backend sends the provider's own structure alongside it precisely so
    // this does not have to guess. Empty is an honest answer when the provider
    // returned prose instead of parts.
    immediateActions: parts.immediate ?? [],
    preventionGuidance: parts.prevention ?? [],
    /** The provider's advice as one piece, for when the split came back empty. */
    remedy: dto.remedy,
    evidence: dto.evidence ?? [],
    imageUri: request.imageUri,
    symptoms: request.symptoms,
    disclaimer: dto.disclaimer,
    diagnosedAt: new Date().toISOString(),
  };
}
