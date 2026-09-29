import { fetchDiagnosisExplanation } from '../../shared/api/diagnosisService';
import type { DiagnosisRequest, DiagnosisResult } from '../../shared/domain/diagnosis';

jest.mock('../../shared/api/http', () => ({
  postJson: jest.fn(),
}));

jest.mock('../../shared/state/authStore', () => ({
  useAuthStore: { getState: () => ({ guestId: 'device-1' }) },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { postJson } = require('../../shared/api/http');

const REQUEST: DiagnosisRequest = {
  crop: 'cassava',
  growthStage: 'vegetative',
  symptoms: 'yellow mottling',
  imageUri: 'file:///leaf.jpg',
  region: 'Bono East',
};

const RESULT: DiagnosisResult = {
  id: 'cmd-1',
  likelyIssue: 'Cassava Mosaic Disease',
  plant: 'Cassava',
  confidenceBand: 'moderate',
  confidenceRangePct: [45, 70],
  immediateActions: ['Pull out and burn plants with clear symptoms.'],
  preventionGuidance: ['Plant clean cuttings from a healthy field.'],
  remedy: 'A virus spread by whiteflies and infected cuttings.',
  evidence: [],
  imageUri: 'file:///leaf.jpg',
  disclaimer: 'A guide, not a sure answer.',
  diagnosedAt: '2026-09-28T00:00:00.000Z',
  source: 'offline-model',
  classId: 'cmd',
  adviceSource: 'knowledge-base',
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('fetchDiagnosisExplanation', () => {
  it('sends the phone answer and its bundled advice, but no photo', async () => {
    postJson.mockResolvedValue({ degraded: true, reason: 'no_key' });

    await fetchDiagnosisExplanation(RESULT, REQUEST);

    const [path, body, options] = postJson.mock.calls[0];
    expect(path).toBe('/api/diagnosis-explanation');
    expect(body).toEqual({
      crop: 'cassava',
      classId: 'cmd',
      likelyIssue: 'Cassava Mosaic Disease',
      confidenceBand: 'moderate',
      symptoms: 'yellow mottling',
      growthStage: 'vegetative',
      region: 'Bono East',
      reference: {
        summary: RESULT.remedy,
        immediateActions: RESULT.immediateActions,
        preventionGuidance: RESULT.preventionGuidance,
      },
    });
    expect(JSON.stringify(body)).not.toContain('leaf.jpg');
    expect(options.headers).toEqual({ 'X-Device-Id': 'device-1' });
  });

  it('returns the AI advice when it arrives', async () => {
    postJson.mockResolvedValue({
      degraded: false,
      explanation: '  Your cassava likely has mosaic disease.  ',
      immediateActions: ['Pull out sick plants.'],
      preventionGuidance: ['Use clean cuttings.'],
    });

    await expect(fetchDiagnosisExplanation(RESULT, REQUEST)).resolves.toEqual({
      explanation: 'Your cassava likely has mosaic disease.',
      immediateActions: ['Pull out sick plants.'],
      preventionGuidance: ['Use clean cuttings.'],
      adviceSource: 'ai',
    });
  });

  it('keeps the bundled list when the AI sends an empty one', async () => {
    postJson.mockResolvedValue({
      degraded: false,
      explanation: 'Your cassava likely has mosaic disease.',
      immediateActions: [],
      preventionGuidance: ['Use clean cuttings.'],
    });

    const extra = await fetchDiagnosisExplanation(RESULT, REQUEST);

    expect(extra?.immediateActions).toEqual(RESULT.immediateActions);
  });

  it('is null when the backend degrades, the request fails, or there is no class', async () => {
    postJson.mockResolvedValue({ degraded: true, reason: 'timeout' });
    await expect(fetchDiagnosisExplanation(RESULT, REQUEST)).resolves.toBeNull();

    postJson.mockRejectedValue(new Error('network'));
    await expect(fetchDiagnosisExplanation(RESULT, REQUEST)).resolves.toBeNull();

    postJson.mockClear();
    await expect(fetchDiagnosisExplanation({ ...RESULT, classId: undefined }, REQUEST)).resolves.toBeNull();
    expect(postJson).not.toHaveBeenCalled();
  });
});
