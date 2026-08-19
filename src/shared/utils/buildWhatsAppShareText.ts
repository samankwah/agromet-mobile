import type { DiagnosisRequest, DiagnosisResult } from '../domain/diagnosis';
import { formatConfidenceRange } from './formatConfidenceRange';

/** Builds the plain-text summary shared via WhatsApp — crop, likely issue,
 * confidence band+range, the single top action, and the disclaimer. Never
 * omits the disclaimer, even in a short share message. */
export function buildWhatsAppShareText(result: DiagnosisResult, request: DiagnosisRequest): string {
  const lines = [
    'AgroMet Ghana — Crop Diagnosis',
    `Crop: ${request.crop} (${request.growthStage})`,
    `Likely issue: ${result.likelyIssue}`,
    formatConfidenceRange(result.confidenceBand, result.confidenceRangePct),
    result.immediateActions[0] ? `Top action: ${result.immediateActions[0]}` : undefined,
    result.disclaimer,
  ].filter((line): line is string => Boolean(line));

  return lines.join('\n');
}
