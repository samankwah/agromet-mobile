import AsyncStorage from '@react-native-async-storage/async-storage';

import type { DiagnosisRequest } from '../../shared/domain/diagnosis';
import {
  enqueueDiagnosisSubmission,
  listQueuedSubmissions,
  listUnsentSubmissions,
  MAX_QUEUE_ATTEMPTS,
  reclaimOrphanedSubmissions,
  removeQueuedSubmission,
  updateQueuedSubmission,
} from '../../shared/storage/diagnosisQueue';

const REQUEST: DiagnosisRequest = {
  crop: 'Maize',
  growthStage: 'Vegetative',
  symptoms: 'Yellow streaks',
  imageUri: 'file:///leaf.jpg',
};

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('the diagnosis queue', () => {
  it('holds a submission made with no connection', async () => {
    await enqueueDiagnosisSubmission(REQUEST);
    const queue = await listQueuedSubmissions();

    expect(queue).toHaveLength(1);
    expect(queue[0].status).toBe('pending');
    expect(queue[0].attempts).toBe(0);
    expect(queue[0].request.imageUri).toBe('file:///leaf.jpg');
  });

  it('gives each submission its own id, so two do not collide', async () => {
    await enqueueDiagnosisSubmission(REQUEST);
    await enqueueDiagnosisSubmission(REQUEST);
    const queue = await listQueuedSubmissions();

    expect(new Set(queue.map((item) => item.localId)).size).toBe(2);
  });

  /**
   * A submission is marked `syncing` before its request goes out. An app killed
   * mid-sweep therefore leaves one stranded in a state excluded from both the
   * retry filter and the pending count: neither sent, nor visible, nor ever
   * retried. It sat there for as long as the app stayed installed.
   */
  describe('reclaimOrphanedSubmissions', () => {
    it('puts an interrupted submission back in line', async () => {
      const item = await enqueueDiagnosisSubmission(REQUEST);
      await updateQueuedSubmission(item.localId, { status: 'syncing', attempts: 1 });

      await reclaimOrphanedSubmissions();

      const [reclaimed] = await listQueuedSubmissions();
      expect(reclaimed.status).toBe('pending');
      // The attempt still happened, so the count must survive the reclaim or
      // an item that fails this way could never reach the cap.
      expect(reclaimed.attempts).toBe(1);
    });

    it('leaves everything else alone', async () => {
      const item = await enqueueDiagnosisSubmission(REQUEST);
      await updateQueuedSubmission(item.localId, { status: 'failed' });

      await reclaimOrphanedSubmissions();

      expect((await listQueuedSubmissions())[0].status).toBe('failed');
    });
  });

  /**
   * `failed` used to be excluded from the retry filter but counted in the
   * badge, so a submission that failed once was never tried again and the
   * "waiting to send" count never cleared.
   */
  describe('listUnsentSubmissions', () => {
    it('returns a failed submission, so it gets another try', async () => {
      const item = await enqueueDiagnosisSubmission(REQUEST);
      await updateQueuedSubmission(item.localId, { status: 'failed' });

      expect(await listUnsentSubmissions()).toHaveLength(1);
    });

    it('drops an abandoned one, because nothing more will happen to it', async () => {
      const item = await enqueueDiagnosisSubmission(REQUEST);
      await updateQueuedSubmission(item.localId, { status: 'abandoned' });

      expect(await listUnsentSubmissions()).toHaveLength(0);
    });
  });

  it('caps the retries rather than trying forever', async () => {
    // `attempts` was recorded and never read, so a submission the server would
    // never accept was retried on every reconnection indefinitely.
    expect(MAX_QUEUE_ATTEMPTS).toBeGreaterThan(1);
    expect(MAX_QUEUE_ATTEMPTS).toBeLessThan(20);
  });

  it('forgets a submission once it is answered', async () => {
    const item = await enqueueDiagnosisSubmission(REQUEST);
    await removeQueuedSubmission(item.localId);

    expect(await listQueuedSubmissions()).toHaveLength(0);
  });
});
