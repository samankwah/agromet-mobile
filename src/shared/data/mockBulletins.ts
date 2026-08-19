import type { Bulletin } from '../domain/bulletin';

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60_000).toISOString();
}
function daysFromNow(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60_000).toISOString();
}

/**
 * Placeholder only — the Bulletin Library milestone builds real list/
 * filter/search/PDF-viewer UI against bulletinService.ts; this just gives
 * that future service something non-empty to return today.
 */
export const MOCK_BULLETINS: Bulletin[] = [
  {
    id: 'bulletin-weekly-32',
    title: 'Weekly Agrometeorological Bulletin — Week 32',
    bulletinType: 'weekly',
    pubDate: daysAgo(1),
    validPeriodStart: daysAgo(1),
    validPeriodEnd: daysFromNow(6),
    coverage: 'National',
    issueNumber: '32/2026',
    source: 'Ghana Meteorological Agency (GMet)',
    summary: 'Above-average rainfall expected across the Northern belt this week; coastal areas remain settled.',
  },
  {
    id: 'bulletin-drought-savannah',
    title: 'Drought Risk Bulletin — Savannah Region',
    bulletinType: 'drought',
    pubDate: daysAgo(3),
    validPeriodStart: daysAgo(3),
    validPeriodEnd: daysFromNow(11),
    coverage: 'Savannah',
    hazardCategory: 'Drought',
    source: 'Ghana Meteorological Agency (GMet)',
    summary: 'Below-normal rainfall over the past two weeks has increased dry-spell risk for rain-fed crops.',
  },
];
