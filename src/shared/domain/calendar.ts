/**
 * Production calendars — crop and poultry alike.
 *
 * These are deliberately ONE type, not two. The backend stores both in a
 * single `calendars` table and serialises them through a single
 * `serialize_calendar` (backend/app/domain.py), discriminated only by
 * `calendarType`. The web app duplicated this into two ~1400-line pages
 * that drifted apart; splitting the type here would guarantee the same.
 *
 * Field names mirror `serialize_calendar` / `serialize_calendar_activity`
 * 1:1, camelCased, so the HTTP response needs no reshaping.
 */

/** `seasonal` = crop, `cycle` = poultry. The backend's own discriminant. */
export type CalendarType = 'seasonal' | 'cycle';

/** The two kinds as a farmer picks them, which is not the same vocabulary
 * as the backend's. Mapped in calendarService. */
export type CalendarKind = 'crop' | 'poultry';

export type Calendar = {
  id: string;
  title: string;
  description?: string;
  calendarType: CalendarType;
  /** For a poultry calendar this holds the bird type ("Broiler"), because
   * the backend reuses the `crop` column for both. */
  crop: string;
  commodity: string;
  region: string;
  regionCode: string;
  district: string;
  districtCode: string;
  year: number | null;
  totalWeeks: number;
  /** Poultry only — equals totalWeeks when calendarType is 'cycle'. */
  cycleDuration?: number | null;
  /** Poultry only, e.g. "Cobb 500". Often empty. */
  breedType?: string | null;
  sampleActivities: string[];
  /**
   * Which season sheets the uploaded workbook carried — "Major Season",
   * "Minor Season". Derived from `fileData.sheets[].name`, because the
   * backend has no season column; a crop calendar is uploaded as one sheet
   * per season and that sheet name is the only record of which it is.
   * Empty for poultry, which has no season concept.
   */
  seasons: string[];
  createdAt: string;
  updatedAt: string;
};

export type CalendarActivity = {
  id: string;
  /** The backend's `activity_code` — a slug of the name. */
  activityId: string;
  activityName: string;
  /** 1-based, inclusive. The whole timeline is indexed in weeks, not dates
   * — a calendar describes a production cycle, not a year.
   *
   * `endWeek` is nullable despite the column being NOT NULL: these rows are
   * derived from spreadsheet parsing, and a single-week activity arriving
   * without one should render on its start week rather than crash. */
  startWeek: number;
  endWeek: number | null;
  productionWeek: number | null;
  /** Harvested from the uploaded spreadsheet's cell fill. */
  backgroundColor?: string | null;
  colors?: string[];
};

/** A farmer's own run of a calendar: a start date turns week indices into
 * real dates. `currentWeek`/`progressPercent` are computed server-side —
 * read them, never recompute, or the phone and the dashboard will disagree
 * about which week a batch is in. */
export type ProductionCycle = {
  id: string;
  calendarId: string;
  batchName: string;
  commodity: string;
  status: 'active' | 'paused' | 'completed';
  startDate: string;
  expectedEndDate: string;
  initialQuantity: number;
  currentQuantity: number;
  notes?: string | null;
  currentWeek: number;
  totalDurationWeeks: number;
  progressPercent: number;
  createdAt: string;
  updatedAt: string;
};

/** What `GET /api/enhanced-calendars/metadata` returns. Drives the filter
 * dropdowns — derived from the rows that actually exist, so every option is
 * guaranteed to match something. */
export type CalendarMetadata = {
  commodities: string[];
  regions: string[];
  districts: string[];
  calendarTypes: string[];
  totalCalendars: number;
};

export function calendarTypeFor(kind: CalendarKind): CalendarType {
  return kind === 'poultry' ? 'cycle' : 'seasonal';
}
