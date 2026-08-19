import { getCached, setCached } from './cache';
import type { DiagnosisRequest, QueuedDiagnosisSubmission } from '../domain/diagnosis';

/**
 * Persisted queue of diagnosis submissions made while offline (or that
 * failed). Distinct from cache.ts's simple get/set because it has real
 * queue semantics — append, list, patch-by-id, remove — not just a single
 * cached value.
 *
 * The photo itself is never stored here: `request.imageUri` is a local
 * file:// URI written by PhotoCapture via expo-image-manipulator, so only a
 * path (not image bytes) sits in this JSON blob, and nothing leaves the
 * device while an item is queued.
 */
const KEY = 'diagnosis-queue';

async function readQueue(): Promise<QueuedDiagnosisSubmission[]> {
  const cached = await getCached<QueuedDiagnosisSubmission[]>(KEY);
  return cached?.value ?? [];
}

async function writeQueue(queue: QueuedDiagnosisSubmission[]): Promise<void> {
  await setCached(KEY, queue);
}

export async function enqueueDiagnosisSubmission(request: DiagnosisRequest): Promise<QueuedDiagnosisSubmission> {
  const queue = await readQueue();
  const item: QueuedDiagnosisSubmission = {
    localId: `queued-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    request,
    queuedAt: new Date().toISOString(),
    status: 'pending',
    attempts: 0,
  };
  await writeQueue([...queue, item]);
  return item;
}

export async function listQueuedSubmissions(): Promise<QueuedDiagnosisSubmission[]> {
  return readQueue();
}

export async function updateQueuedSubmission(localId: string, patch: Partial<QueuedDiagnosisSubmission>): Promise<void> {
  const queue = await readQueue();
  await writeQueue(queue.map((item) => (item.localId === localId ? { ...item, ...patch } : item)));
}

export async function removeQueuedSubmission(localId: string): Promise<void> {
  const queue = await readQueue();
  await writeQueue(queue.filter((item) => item.localId !== localId));
}
