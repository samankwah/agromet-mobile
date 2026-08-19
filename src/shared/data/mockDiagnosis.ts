import type { DiagnosisRequest, DiagnosisResult } from '../domain/diagnosis';

const DISCLAIMER =
  'This is decision support, not a guaranteed diagnosis. Confirm with an agricultural extension officer if symptoms persist.';

type DiagnosisTemplate = Omit<DiagnosisResult, 'id' | 'diagnosedAt'> & {
  /** Crop names (lowercased) this template applies to. */
  crops: string[];
  /** Symptom keywords (lowercased) that select this template over the crop's default. */
  keywords: string[];
};

/**
 * A small set of canned, Ghana-relevant crop issues. `submitDiagnosis`
 * (shared/api/diagnosisService.ts) matches the farmer's crop + symptom text
 * against these — crude keyword matching, good enough for mock data, and
 * the exact matching strategy is irrelevant to the UI once a real Azure ML
 * endpoint replaces it.
 */
const TEMPLATES: DiagnosisTemplate[] = [
  {
    crops: ['maize', 'corn'],
    keywords: ['hole', 'holes', 'caterpillar', 'armyworm', 'chewed', 'boring'],
    likelyIssue: 'Fall armyworm damage',
    confidenceBand: 'moderate',
    confidenceRangePct: [55, 70],
    immediateActions: [
      'Inspect the whorl of affected plants for larvae and remove by hand where practical.',
      'Apply an approved biopesticide (e.g. Bt-based product) in the early morning or evening.',
      'Avoid broad-spectrum insecticides that also kill natural predators.',
    ],
    preventionGuidance: [
      'Scout fields weekly from early vegetative stage through tasseling.',
      'Rotate maize with a non-host crop such as legumes where possible.',
    ],
    disclaimer: DISCLAIMER,
  },
  {
    crops: ['cassava'],
    keywords: ['yellow', 'mosaic', 'mottled', 'curled leaves', 'stunted'],
    likelyIssue: 'Cassava mosaic disease',
    confidenceBand: 'moderate',
    confidenceRangePct: [50, 65],
    immediateActions: [
      'Remove and destroy visibly infected plants to reduce spread.',
      'Avoid taking planting material (cuttings) from affected plants.',
    ],
    preventionGuidance: [
      'Source cuttings only from certified disease-free planting material next season.',
      'Control whitefly populations, which spread the virus between plants.',
    ],
    disclaimer: DISCLAIMER,
  },
  {
    crops: ['tomato', 'tomatoes'],
    keywords: ['spots', 'blight', 'wilting', 'brown patches', 'lesion'],
    likelyIssue: 'Early blight',
    confidenceBand: 'moderate',
    confidenceRangePct: [50, 68],
    immediateActions: [
      'Remove and destroy affected lower leaves to slow spread.',
      'Apply an approved fungicide, following the label rate and interval.',
      'Avoid overhead watering — water at the base of the plant instead.',
    ],
    preventionGuidance: [
      'Space plants to improve airflow and reduce leaf wetness.',
      'Rotate tomato out of the same plot for at least one season.',
    ],
    disclaimer: DISCLAIMER,
  },
];

/** Fallback used when nothing matches crop/keywords — deliberately low
 * confidence and generic, never invents specificity it doesn't have. */
const FALLBACK: DiagnosisTemplate = {
  crops: [],
  keywords: [],
  likelyIssue: 'Unable to narrow down a specific issue from the details provided',
  confidenceBand: 'low',
  confidenceRangePct: [20, 40],
  immediateActions: [
    'Isolate the affected plants from healthy ones where practical.',
    'Take a clear, well-lit photo of the affected leaves and stems for a follow-up assessment.',
  ],
  preventionGuidance: ['Contact your local agricultural extension officer for an in-person assessment.'],
  disclaimer: DISCLAIMER,
};

function selectTemplate(request: DiagnosisRequest): DiagnosisTemplate {
  const crop = request.crop.trim().toLowerCase();
  const symptoms = request.symptoms.trim().toLowerCase();

  const cropMatches = TEMPLATES.filter((template) => template.crops.includes(crop));
  const withKeyword = cropMatches.find((template) => template.keywords.some((keyword) => symptoms.includes(keyword)));

  return withKeyword ?? cropMatches[0] ?? FALLBACK;
}

let sequence = 0;

export function buildMockDiagnosisResult(request: DiagnosisRequest): DiagnosisResult {
  const template = selectTemplate(request);
  sequence += 1;
  return {
    id: `diagnosis-${Date.now()}-${sequence}`,
    diagnosedAt: new Date().toISOString(),
    likelyIssue: template.likelyIssue,
    confidenceBand: template.confidenceBand,
    confidenceRangePct: template.confidenceRangePct,
    immediateActions: template.immediateActions,
    preventionGuidance: template.preventionGuidance,
    disclaimer: template.disclaimer,
  };
}
