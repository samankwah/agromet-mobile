import type { WeatherAlert } from '../domain/weatherAlert';

function hoursFromNow(hours: number): string {
  return new Date(Date.now() + hours * 60 * 60_000).toISOString();
}

function hoursAgo(hours: number): string {
  return hoursFromNow(-hours);
}

/**
 * The two required mock alerts, plus one calmer example so saved-district
 * filtering has something to actually filter (Accra with no alert shows the
 * "no active alerts" state).
 */
export const MOCK_ALERTS: WeatherAlert[] = [
  {
    id: 'alert-northern-heavy-rainfall',
    headline: 'Heavy Rainfall Warning — Northern Region',
    district: 'Tamale Metropolitan',
    region: 'Northern',
    hazardType: 'Heavy Rainfall',
    severity: 'warning',
    issuedAt: hoursAgo(3),
    expiresAt: hoursFromNow(21),
    expectedImpacts: [
      'Flooding of low-lying farmland and waterlogged fields.',
      'Waterlogging risk for maize and rice plots near rivers and streams.',
      'Washed-out feeder roads may delay transport of produce to market.',
    ],
    farmerActions: [
      'Delay fertilizer application until rainfall reduces.',
      'Clear field drainage channels to reduce waterlogging.',
      'Move livestock and stored grain to higher ground.',
      'Postpone harvesting of maturing crops where flooding risk is high.',
    ],
    source: 'Ghana Meteorological Agency (GMet)',
  },
  {
    id: 'alert-savannah-drought',
    headline: 'Dry Spell Watch — Savannah Region',
    district: 'West Gonja (Damongo)',
    region: 'Savannah',
    hazardType: 'Drought',
    severity: 'watch',
    issuedAt: hoursAgo(20),
    expiresAt: hoursFromNow(72),
    expectedImpacts: [
      'Reduced soil moisture stressing newly planted seedlings.',
      'Slower germination for rain-fed maize and sorghum.',
      'Increased irrigation demand on available water sources.',
    ],
    farmerActions: [
      'Prioritize irrigation for newly planted seedlings.',
      'Delay planting of rain-fed crops until soil moisture improves.',
      'Mulch around seedlings to conserve soil moisture.',
    ],
    source: 'Ghana Meteorological Agency (GMet)',
  },
  {
    id: 'alert-yendi-heavy-rainfall',
    headline: 'Heavy Rainfall Watch — Yendi Municipal',
    district: 'Yendi Municipal',
    region: 'Northern',
    hazardType: 'Heavy Rainfall',
    severity: 'watch',
    issuedAt: hoursAgo(3),
    expiresAt: hoursFromNow(21),
    expectedImpacts: ['Localized flooding possible in low-lying compounds and farmland.'],
    farmerActions: ['Clear field drainage channels to reduce waterlogging.', 'Delay fertilizer application until rainfall reduces.'],
    source: 'Ghana Meteorological Agency (GMet)',
  },
];

/** Returns alerts for the given district ids (matched by district name).
 * Empty `districtIds` returns every alert, so the app isn't blank before a
 * farmer has saved any districts. */
export function getMockAlertsForDistricts(districtNames: string[]): WeatherAlert[] {
  if (districtNames.length === 0) return MOCK_ALERTS;
  return MOCK_ALERTS.filter((alert) => districtNames.includes(alert.district));
}
