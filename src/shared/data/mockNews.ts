import type { NewsUpdate } from '../domain/news';

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60_000).toISOString();
}

/** Mirrors the web app's hardcoded "News and Updates" cards in
 * spirit (frontend/src/pages/Home.jsx) — there's no dynamic news backend
 * anywhere in the AgroMet codebase, so this stays simple mock content. */
export const MOCK_NEWS: NewsUpdate[] = [
  {
    id: 'news-gmet-field-visit',
    title: 'GMet extends farmer field visits to three more districts',
    summary: 'Meteorological officers are running on-the-ground briefings to help farmers interpret weekly advisories directly.',
    publishedAt: daysAgo(2),
    category: 'programme',
  },
  {
    id: 'news-son-forecast-update',
    title: 'Start-of-season forecast now available for the Northern belt',
    summary:
      'The season-onset outlook for Northern, Savannah, and Upper regions has been published — check the Advisories tab for details.',
    publishedAt: daysAgo(5),
    category: 'announcement',
  },
  {
    id: 'news-whatsapp-sharing',
    title: 'Advisories can now be shared directly to WhatsApp',
    summary: "A new share button lets you send an advisory's key points straight to family or a farmer group chat.",
    publishedAt: daysAgo(9),
    category: 'news',
  },
];

export function getLatestNews(): NewsUpdate {
  return MOCK_NEWS[0];
}
