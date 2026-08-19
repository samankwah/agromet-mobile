import { buildMockDiagnosisResult } from '../data/mockDiagnosis';
import type { DiagnosisRequest, DiagnosisResult } from '../domain/diagnosis';
import { mockDelay } from './mockDelay';

/**
 * Sole swap point for crop diagnosis. This function's signature —
 * `DiagnosisRequest in, Promise<DiagnosisResult> out` — is the entire
 * contract a real endpoint must satisfy, whether that's a purpose-built
 * Azure ML endpoint or the existing backend's Kindwise-based
 * POST /api/crop-diagnosis (backend/app/diagnosis.py). No UI component
 * calls a diagnosis endpoint directly; useDiagnose.ts is the only caller.
 *
 * Deliberately never resolves to a single confident number — see
 * DiagnosisResult.confidenceRangePct.
 */
export async function submitDiagnosis(request: DiagnosisRequest): Promise<DiagnosisResult> {
  return mockDelay(buildMockDiagnosisResult(request), 900);
}
