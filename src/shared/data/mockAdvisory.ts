import type { AgroAdvisory } from '../domain/advisory';

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60_000).toISOString();
}

function daysFromNow(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60_000).toISOString();
}

/**
 * A handful of advisory teasers, loosely shaped like the backend's
 * weekly_advisories records (region/district/crop-scoped, published by
 * GMet/MoFA content, see backend/app/domain.py serialize_advisory) but
 * trimmed to what Home's teaser card needs.
 */
export const MOCK_ADVISORIES: AgroAdvisory[] = [
  {
    id: 'advisory-northern-maize-week32',
    title: 'Maize: manage waterlogging risk this week',
    districts: ['Tamale Metropolitan', 'Yendi Municipal'],
    crops: ['Maize'],
    publishedAt: daysAgo(1),
    validUntil: daysFromNow(6),
    summary:
      'Above-average rainfall is expected across Northern Region this week. Maize fields on low-lying land are at risk of waterlogging, which can stunt growth and encourage fungal disease.',
    farmerActions: [
      'Delay fertilizer application until rainfall reduces.',
      'Open or clear drainage channels around low-lying plots.',
      'Scout for early signs of leaf blight after heavy rain.',
    ],
    severity: 'warning',
    kind: 'crop-specific',
    crop: 'Maize',
    district: 'Tamale Metropolitan',
  },
  {
    id: 'advisory-savannah-planting-window',
    title: 'Sorghum: hold off planting until soil moisture recovers',
    districts: ['West Gonja (Damongo)'],
    crops: ['Sorghum', 'Millet'],
    publishedAt: daysAgo(2),
    validUntil: daysFromNow(10),
    summary: 'Rainfall has been below normal across Savannah Region for the past two weeks. Planting into dry soil risks poor germination.',
    farmerActions: [
      'Delay planting of rain-fed crops until soil moisture improves.',
      'Prioritize irrigation for any seedlings already in the ground.',
    ],
    severity: 'watch',
    kind: 'crop-specific',
    crop: 'Sorghum',
    district: 'West Gonja (Damongo)',
  },
  {
    id: 'advisory-coastal-general-week32',
    title: 'Coastal districts: favorable conditions for fieldwork',
    districts: ['Accra Metropolitan', 'Cape Coast Metropolitan'],
    crops: ['Vegetables', 'Cassava'],
    publishedAt: daysAgo(1),
    validUntil: daysFromNow(6),
    summary:
      'Conditions along the coast remain settled this week with no significant rainfall expected — a good window for weeding and fertilizer application.',
    farmerActions: [
      'Apply fertilizer while soil moisture is adequate but fields are not waterlogged.',
      'Complete weeding before the next rains.',
    ],
    severity: 'normal',
    kind: 'general',
  },
];

/** Latest advisory relevant to a district name, or the most recent
 * district-agnostic one as a fallback so the teaser card is never empty. */
export function getMockAdvisoryForDistrict(districtName: string | undefined): AgroAdvisory {
  const match = districtName ? MOCK_ADVISORIES.find((advisory) => advisory.districts.includes(districtName)) : undefined;
  return match ?? MOCK_ADVISORIES[0];
}
