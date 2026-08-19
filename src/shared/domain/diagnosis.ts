/**
 * Crop diagnosis types. `DiagnosisRequest` and `DiagnosisResult` are the
 * entire contract shared/api/diagnosisService.ts commits to — a real Azure
 * ML endpoint (or the existing backend's Kindwise-based /api/crop-diagnosis)
 * must accept the former and return the latter shape; no UI component talks
 * to the endpoint directly, only through that one service function.
 */
export type DiagnosisRequest = {
  crop: string;
  growthStage: string;
  symptoms: string;
  /** Local file URI of the already-compressed photo, if the farmer attached one. */
  imageUri?: string;
};

export type DiagnosisConfidenceBand = 'low' | 'moderate' | 'high';

export type DiagnosisResult = {
  id: string;
  likelyIssue: string;
  confidenceBand: DiagnosisConfidenceBand;
  /** A range, never a single point value — an AI result should never claim
   * false precision. e.g. [55, 70] renders as "Moderate confidence (55–70%)". */
  confidenceRangePct: [number, number];
  immediateActions: string[];
  preventionGuidance: string[];
  disclaimer: string;
  diagnosedAt: string; // ISO 8601
};

/** A diagnosis submission waiting to sync because the device was offline
 * (or the mock/real call failed) when the farmer submitted it. */
export type QueuedDiagnosisSubmission = {
  localId: string;
  request: DiagnosisRequest;
  queuedAt: string; // ISO 8601
  status: 'pending' | 'syncing' | 'failed';
  attempts: number;
};
