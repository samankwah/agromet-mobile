/** Tier B this increment — type + placeholder mock only (future "Bulletin
 * Library" milestone), except `bulletinService.getLatestBulletinTeaser()`
 * which is also Tier B (Home's "latest news" card uses newsService/
 * NewsUpdate instead — bulletins and news are explicitly distinct in the
 * user's own spec). */
export type BulletinType = 'weekly' | 'monthly' | 'subseasonal' | 'seasonal' | 'flood' | 'drought';

export type Bulletin = {
  id: string;
  title: string;
  bulletinType: BulletinType;
  pubDate: string; // ISO 8601
  validPeriodStart: string; // ISO 8601
  validPeriodEnd: string; // ISO 8601
  coverage: string; // e.g. "National" or a region name
  issueNumber?: string;
  hazardCategory?: string;
  source: string;
  summary: string;
  pdfUrl?: string;
  downloadedLocally?: boolean;
};
