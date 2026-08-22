/**
 * A published weekly agrometeorological advisory.
 *
 * Distinct from `AgroAdvisory` in domain/advisory.ts, which is a one-paragraph
 * teaser for the Home screen. This is the full bulletin an extension officer
 * uploads as a spreadsheet: one worksheet per activity, each carrying a week's
 * forecast for nine weather parameters, what each implies, and what to do about
 * it.
 *
 * Mirrors what `backend/app/spreadsheet_parser.py` actually emits, not what the
 * table columns suggest. Two things are easy to get wrong there:
 *
 *   - The forecast does NOT come from `weather_forecast_json`. That column
 *     holds only the parameter names. The values live inside each element of
 *     `advisories_json`.
 *   - Crop and poultry bulletins are different shapes, not one shape with a
 *     flag. A crop advisory carries per-worksheet objects; a poultry advisory
 *     carries a list of plain strings and a flat metrics map, with no forecast
 *     table anywhere in the data.
 */

export type AdvisoryKind = 'crop' | 'poultry';

/**
 * One weather parameter for one activity, with all three of its readings.
 *
 * The backend stores these as three parallel maps keyed by parameter name. They
 * are zipped into rows in the service so that nothing downstream has to reach
 * across three objects and decide what a missing cell means.
 */
export type ForecastRow = {
  /** The parameter name as the spreadsheet spelled it, e.g. "RAINFALL", "EVAPO-TRANSP." */
  parameter: string;
  forecast: string;
  implication: string;
  advisory: string;
};

/** The header block: where this advisory applies and for which week. */
export type AdvisoryMetadata = {
  zone: string;
  region: string;
  district: string;
  monthYear: string;
  week: string;
  startDate: string;
  endDate: string;
  crop: string;
};

/**
 * One activity within a bulletin — a single worksheet.
 *
 * `summaryTitle` and `summaryBody` belong to the activity, not to the bulletin.
 * The bulletin's own top-level `summary` is the uploader's description or a
 * generic "parsed N activities" string, which is no use to a farmer.
 */
export type AdvisoryActivity = {
  activity: string;
  metadata: AdvisoryMetadata;
  rows: ForecastRow[];
  summaryTitle: string | null;
  summaryBody: string | null;
};

export type WeeklyAdvisory = {
  id: string;
  kind: AdvisoryKind;
  title: string;
  region: string;
  district: string;
  crop: string;
  year: number | null;
  season: string;
  /** Crop bulletins only. Empty for poultry, which has no per-activity sheets. */
  activities: AdvisoryActivity[];
  /** Poultry bulletins only: the recommended-actions list. */
  recommendations: string[];
  /** Poultry bulletins only: a flat parameter to recommended-value map. */
  managementMetrics: Record<string, string>;
  summary: string;
  createdAt: string;
};

/** One row of the activity picker, from GET /api/weekly-advisories/activities. */
export type AdvisoryActivityRef = {
  id: number;
  advisoryId: number;
  activity: string;
  weekLabel: string | null;
  region: string;
  district: string;
  crop: string;
  year: number | null;
};

/** What the farmer has narrowed the search to. */
export type AdvisoryFilterState = {
  /**
   * The agro-ecological zone. Narrows the region list and nothing else — it is
   * not sent to the server, which indexes bulletins by district. A region can
   * sit in two zones, so this cannot be derived from the region alone.
   */
  zone: string;
  region: string;
  district: string;
  /** The crop, or the bird for a poultry advisory. */
  subject: string;
};

export const EMPTY_ADVISORY_FILTERS: AdvisoryFilterState = { zone: '', region: '', district: '', subject: '' };

/** A search is only worth running once region, district and subject are set. */
export function isAdvisoryFilterComplete(filter: AdvisoryFilterState): boolean {
  return filter.region !== '' && filter.district !== '' && filter.subject !== '';
}

/**
 * One published advisory, as it appears in the archive list.
 *
 * Deliberately shallower than `WeeklyAdvisory`: the list endpoint returns
 * activity *names* only, not their forecast tables, so a row can say what an
 * advisory covers without carrying the whole bulletin. The full record is
 * fetched when a row is opened.
 *
 * `createdAt` is when the record was uploaded, NOT the period it applies to.
 * The advisory's real window lives in `metadata.startDate`/`endDate` inside
 * each activity, which the list payload does not include — so anything built
 * on this field must say "published", never "valid".
 */
export type ArchivedAdvisory = {
  id: number;
  kind: AdvisoryKind;
  title: string;
  description: string;
  region: string;
  district: string;
  /** The crop, or the bird for a poultry advisory. */
  subject: string;
  year: number | null;
  createdAt: string;
  activityCount: number;
  /** Activity names, e.g. "Land preparation". Searchable; no forecast data. */
  activities: string[];
  /** Free-text labels such as "Weeks 5-8", as typed in the uploaded sheet. */
  weekLabels: string[];
};
