import { getCached, setCached } from './cache';
import type { DiagnosisResult } from '../domain/diagnosis';

/**
 * Past diagnoses, on the device.
 *
 * The backend has history endpoints, but they sit behind `Depends(get_current_user)`
 * and this app is deliberately account-free. Requiring a farmer to register
 * before they can look back at their own crop photos would be a poor trade,
 * and it would put the record behind the very connection that was missing when
 * the diagnosis was queued in the first place. So history is local.
 *
 * That is not a dead end: the backend already writes a record whenever a
 * bearer token is present, so a future login can merge server-side history
 * without this file changing.
 *
 * This is also where a queued submission's answer arrives. Before, the offline
 * sweep resolved a result and dropped it on the floor, so a farmer who
 * submitted without signal got a badge that cleared and nothing else.
 */
const KEY = 'diagnosis-history';

/** Enough to look back over a season without letting a JSON blob of results
 * grow without bound on a low-end phone. */
const MAX_ENTRIES = 50;

export async function listDiagnosisHistory(): Promise<DiagnosisResult[]> {
  const cached = await getCached<DiagnosisResult[]>(KEY);
  return cached?.value ?? [];
}

/** Newest first, because that is the order anyone looks for. */
export async function recordDiagnosis(result: DiagnosisResult): Promise<void> {
  const history = await listDiagnosisHistory();
  await setCached(KEY, [result, ...history].slice(0, MAX_ENTRIES));
}

export async function clearDiagnosisHistory(): Promise<void> {
  await setCached(KEY, []);
}
