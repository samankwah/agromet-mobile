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

/**
 * How many times a submission is retried before it is given up on.
 *
 * `attempts` used to be incremented and never read, so a submission the server
 * would never accept was retried on every reconnection for as long as the app
 * stayed installed. A cap turns that into a state the farmer can be told
 * about.
 */
export const MAX_QUEUE_ATTEMPTS = 5;

/**
 * Put back anything left mid-flight by a previous run.
 *
 * A submission is marked `syncing` before the request goes out, so an app
 * killed mid-sweep leaves it there forever: `syncing` is excluded from the
 * retry filter *and* from the pending count, which means the farmer's
 * submission is neither sent nor visible. Called on mount, before the first
 * sweep, because there cannot legitimately be a request in flight at that
 * point.
 */
export async function reclaimOrphanedSubmissions(): Promise<void> {
  const queue = await readQueue();
  if (!queue.some((item) => item.status === 'syncing')) return;

  await writeQueue(queue.map((item) => (item.status === 'syncing' ? { ...item, status: 'pending' } : item)));
}

/** Everything still owed an answer, oldest first. `abandoned` is excluded:
 * it is terminal, and counting it would keep a badge lit over work that will
 * never happen. */
export async function listUnsentSubmissions(): Promise<QueuedDiagnosisSubmission[]> {
  const queue = await readQueue();
  return queue.filter((item) => item.status !== 'abandoned');
}
