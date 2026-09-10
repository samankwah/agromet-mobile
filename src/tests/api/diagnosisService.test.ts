import { adaptDiagnosis } from '../../shared/api/diagnosisService';
import { isDiagnosisUnavailable } from '../../shared/domain/diagnosis';
import type { DiagnosisRequest } from '../../shared/domain/diagnosis';

const REQUEST: DiagnosisRequest = {
  crop: 'Maize',
  growthStage: 'Vegetative',
  symptoms: 'Yellow streaks on the leaves',
  imageUri: 'file:///leaf.jpg',
};

/** The backend's shape, as `backend/app/diagnosis.py` actually builds it. */
function dto(overrides: Record<string, unknown> = {}) {
  return {
    status: 'ok',
    isAvailable: true,
    plant: 'maize',
    disease: 'Maize streak virus',
    remedy: 'Prevention: Control insect vectors.',
    treatmentParts: {
      immediate: ['Remove and burn infected plants'],
      prevention: ['Use resistant seed'],
    },
    confidence: 0.82,
    evidence: ['yellow streaks'],
    notes: [],
    disclaimer: 'Decision support only.',
    ...overrides,
  } as Parameters<typeof adaptDiagnosis>[0];
}

/**
 * The seam where a provider change would first show up. Pinning it against a
 * captured response is cheaper than discovering the drift on a farmer's phone.
 */
describe('adaptDiagnosis', () => {
  it('carries the provider structure across without re-deriving it', () => {
    const result = adaptDiagnosis(dto(), REQUEST);
    if (isDiagnosisUnavailable(result)) throw new Error('expected a result');

    expect(result.likelyIssue).toBe('Maize streak virus');
    expect(result.plant).toBe('maize');
    expect(result.immediateActions).toEqual(['Remove and burn infected plants']);
    expect(result.preventionGuidance).toEqual(['Use resistant seed']);
    expect(result.confidenceBand).toBe('high');
  });

  it('keeps the photo and the farmer note with the answer', () => {
    // The photo is the evidence the result was drawn from, and the note is the
    // farmer's own words. Dropping either leaves an answer with no provenance.
    const result = adaptDiagnosis(dto(), REQUEST);
    if (isDiagnosisUnavailable(result)) throw new Error('expected a result');

    expect(result.imageUri).toBe('file:///leaf.jpg');
    expect(result.symptoms).toBe('Yellow streaks on the leaves');
  });

  describe('when the provider cannot answer', () => {
    /* Three real causes, one honest outcome. None of them is a diagnosis, and
       routing any of them through the result card would present an absence as
       a finding. */
    it('reports a non-ok status as unavailable, carrying the reason', () => {
      const result = adaptDiagnosis(
        dto({ status: 'unavailable', confidence: null, remedy: 'No provider is configured.' }),
        REQUEST,
      );

      expect(isDiagnosisUnavailable(result)).toBe(true);
      if (!isDiagnosisUnavailable(result)) return;
      expect(result.reason).toBe('No provider is configured.');
    });

    it('treats a missing confidence as unavailable even when the status says ok', () => {
      // Belt and braces: a result with no score cannot be banded, and banding
      // it anyway would put an invented number on screen.
      const result = adaptDiagnosis(dto({ confidence: null }), REQUEST);

      expect(isDiagnosisUnavailable(result)).toBe(true);
    });
  });

  it('leaves the lists empty rather than splitting prose into fake steps', () => {
    // Some providers return advice as one paragraph. The whole point of the
    // backend sending `treatmentParts` is that this adapter never has to guess
    // at structure by cutting on full stops.
    const result = adaptDiagnosis(dto({ treatmentParts: undefined }), REQUEST);
    if (isDiagnosisUnavailable(result)) throw new Error('expected a result');

    expect(result.immediateActions).toEqual([]);
    expect(result.preventionGuidance).toEqual([]);
    // ...but the prose itself survives, so the farmer still gets the advice.
    expect(result.remedy).toBe('Prevention: Control insect vectors.');
  });
});
