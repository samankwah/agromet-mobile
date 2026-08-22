import {
  MOCK_ADVISORY_ARCHIVE,
  MOCK_CROP_ADVISORY,
  MOCK_POULTRY_ADVISORY,
} from '../data/mockWeeklyAdvisory';
import type {
  AdvisoryActivity,
  AdvisoryActivityRef,
  AdvisoryFilterState,
  AdvisoryKind,
  ArchivedAdvisory,
  ForecastRow,
  WeeklyAdvisory,
} from '../domain/weeklyAdvisory';
import { getJson, NetworkError } from './http';

/**
 * Weekly advisories, over real HTTP.
 *
 * All the reshaping the app needs lives here, so no screen has to know how the
 * spreadsheet parser happened to lay its output out. Three jobs:
 *
 *   1. The activities endpoint answers in flat snake_case while the detail
 *      endpoint answers in camelCase. Both become domain types here.
 *   2. A crop activity stores its forecast as three parallel maps keyed by
 *      parameter name. They are zipped into rows, so a renderer never has to
 *      reach across three objects or decide what a missing cell means.
 *   3. `"REG02/Ashanti Region"` is split to its readable half.
 *
 * Falls back to the seeded copy the same way calendarService does, and reports
 * which of the two reasons applied.
 */

/**
 * Why seeded data is on screen, if it is.
 *
 *   'offline'  the server could not be reached
 *   'empty'    the server answered, and has published nothing for this district
 *
 * The distinction earns its keep here more than anywhere else in the app: the
 * advisory tables are genuinely empty in every database today, so collapsing
 * these two into one message would permanently hide the fact that nothing has
 * ever been uploaded.
 */
export type AdvisoryFallback = 'offline' | 'empty' | null;

export type AdvisoryResult<T> = { data: T; fallback: AdvisoryFallback };

type ActivityRefDto = {
  id: number;
  advisory_id: number;
  activity: string;
  week_label: string | null;
  region: string | null;
  district: string | null;
  crop: string | null;
  year: number | null;
};

type ParsedActivityDto = {
  activity?: string;
  metadata?: Record<string, string>;
  weatherParameters?: string[];
  forecast?: Record<string, string>;
  implication?: Record<string, string>;
  advisory?: Record<string, string>;
  summaryTitle?: string;
  summaryBody?: string;
};

type AdvisoryDto = {
  id: number;
  title?: string;
  advisoryType?: string;
  region?: string;
  district?: string;
  crop?: string;
  year?: number | null;
  season?: string;
  summary?: string;
  weatherForecast?: Record<string, unknown>;
  advisories?: unknown[];
  created_at?: string;
};

/**
 * `"REG02/Ashanti Region"` to `"Ashanti Region"`.
 *
 * The spreadsheet template writes a code and a name in one cell. Only the name
 * is worth showing, but the separator is optional in practice, so a value with
 * no slash passes through untouched.
 */
function readableName(value: string | undefined): string {
  if (!value) return '';
  const slash = value.indexOf('/');
  return slash === -1 ? value.trim() : value.slice(slash + 1).trim();
}

/**
 * Zip the three parallel maps into one row per parameter.
 *
 * The parameter order comes from `weatherParameters`, which is the spreadsheet's
 * own column order — sorting it or deriving it from the map keys would scramble
 * a layout the officer chose deliberately.
 */
function toRows(entry: ParsedActivityDto): ForecastRow[] {
  const parameters = entry.weatherParameters ?? [];
  return parameters.map((parameter) => ({
    parameter,
    // The parser writes a literal "-" for a blank cell, but a bulletin edited
    // by hand can still be missing the key altogether.
    forecast: entry.forecast?.[parameter] ?? '-',
    implication: entry.implication?.[parameter] ?? '-',
    advisory: entry.advisory?.[parameter] ?? '-',
  }));
}

function toActivity(entry: ParsedActivityDto): AdvisoryActivity {
  const metadata = entry.metadata ?? {};

  return {
    activity: entry.activity ?? 'Activity',
    metadata: {
      zone: metadata.zone ?? '',
      region: readableName(metadata.region),
      district: readableName(metadata.district),
      monthYear: metadata.month_year ?? '',
      week: metadata.week ?? '',
      startDate: metadata.start_date ?? '',
      endDate: metadata.end_date ?? '',
      crop: readableName(metadata.crop),
    },
    rows: toRows(entry),
    summaryTitle: entry.summaryTitle?.trim() || null,
    summaryBody: entry.summaryBody?.trim() || null,
  };
}

/**
 * Split the `advisories` array by what its elements actually are.
 *
 * Deliberately structural rather than switching on `advisoryType`. A crop
 * bulletin whose worksheets failed to parse degrades to a string array
 * indistinguishable from a poultry one, and a renderer that trusted the type
 * field would then try to draw a forecast table out of strings.
 */
function partitionAdvisories(entries: unknown[]): { activities: AdvisoryActivity[]; recommendations: string[] } {
  const activities: AdvisoryActivity[] = [];
  const recommendations: string[] = [];

  for (const entry of entries) {
    if (typeof entry === 'string') {
      recommendations.push(entry);
      continue;
    }
    if (entry && typeof entry === 'object') {
      activities.push(toActivity(entry as ParsedActivityDto));
    }
  }

  return { activities, recommendations };
}

function toWeeklyAdvisory(dto: AdvisoryDto): WeeklyAdvisory {
  const { activities, recommendations } = partitionAdvisories(dto.advisories ?? []);
  const kind: AdvisoryKind = dto.advisoryType === 'poultry-advisory' ? 'poultry' : 'crop';

  // For poultry the backend reroutes management metrics through the weather
  // forecast column. It is not a forecast, and is only read as metrics here.
  const metrics =
    kind === 'poultry' && dto.weatherForecast
      ? Object.fromEntries(
          Object.entries(dto.weatherForecast).filter(([, value]) => typeof value === 'string'),
        )
      : {};

  return {
    id: String(dto.id),
    kind,
    title: dto.title ?? 'Weekly advisory',
    region: readableName(dto.region),
    district: readableName(dto.district),
    crop: readableName(dto.crop),
    year: dto.year ?? null,
    season: dto.season ?? '',
    activities,
    recommendations,
    managementMetrics: metrics as Record<string, string>,
    summary: dto.summary ?? '',
    createdAt: dto.created_at ?? '',
  };
}

/** `GET /api/weekly-advisories` — `advisory_list_item` in backend/app/main.py. */
type AdvisoryListDto = AdvisoryDto & {
  /** Emitted by serialize_advisory but unused by the detail screen, so it is
   * declared here rather than on AdvisoryDto. */
  description?: string;
  activityCount?: number;
  /** Names only. The list endpoint overwrites the rich `advisories` array with
   * these, so a row cannot show forecast content without the detail call. */
  activities?: unknown;
  weekLabels?: (string | null)[];
};

function toArchivedAdvisory(dto: AdvisoryListDto): ArchivedAdvisory {
  const kind: AdvisoryKind = dto.advisoryType === 'poultry-advisory' ? 'poultry' : 'crop';

  return {
    id: Number(dto.id),
    kind,
    title: dto.title ?? 'Weekly advisory',
    description: dto.description ?? '',
    region: readableName(dto.region),
    district: readableName(dto.district),
    subject: readableName(dto.crop),
    year: dto.year ?? null,
    createdAt: dto.created_at ?? '',
    activityCount: dto.activityCount ?? 0,
    // Guarded because `advisories` carries parsed objects on the detail
    // endpoint and plain names here; anything else is dropped rather than
    // rendered as "[object Object]".
    activities: Array.isArray(dto.activities)
      ? dto.activities.filter((name): name is string => typeof name === 'string')
      : [],
    weekLabels: (dto.weekLabels ?? []).filter((label): label is string => Boolean(label)),
  };
}

function toActivityRef(dto: ActivityRefDto): AdvisoryActivityRef {
  return {
    id: dto.id,
    advisoryId: dto.advisory_id,
    activity: dto.activity,
    weekLabel: dto.week_label ?? null,
    region: dto.region ?? '',
    district: dto.district ?? '',
    crop: dto.crop ?? '',
    year: dto.year ?? null,
  };
}

/** The seeded bulletin for a kind, used when the server has nothing. */
export function seededAdvisory(kind: AdvisoryKind): WeeklyAdvisory {
  return kind === 'poultry' ? MOCK_POULTRY_ADVISORY : MOCK_CROP_ADVISORY;
}

/**
 * Which activities exist for a district, so the farmer can pick one.
 *
 * The backend matches region loosely (code, full name, or name without the
 * " Region" suffix) but matches district and crop exactly, so the values sent
 * here must be the catalogue's own spellings.
 */
export async function listAdvisoryActivities(
  filter: AdvisoryFilterState,
): Promise<AdvisoryResult<AdvisoryActivityRef[]>> {
  try {
    const data = await getJson<ActivityRefDto[]>('/api/weekly-advisories/activities', {
      region: filter.region,
      district: filter.district,
      crop: filter.subject,
    });
    const refs = (data ?? []).map(toActivityRef);
    return { data: refs, fallback: refs.length === 0 ? 'empty' : null };
  } catch (error) {
    if (error instanceof NetworkError) return { data: [], fallback: 'offline' };
    throw error;
  }
}

/**
 * One bulletin, with every activity it contains.
 *
 * Fetched whole rather than per activity. The detail endpoint accepts an
 * `?activity=` parameter and the web app calls it again on every sidebar click,
 * but the first response already carries all of them, so switching activity on
 * the phone costs nothing and works offline.
 */
/**
 * Every published advisory, for the archive.
 *
 * Called with no query params on purpose. The endpoint's filters match the
 * `*_code` columns exactly, so passing the app's human-readable values
 * ("Ashanti Region", "Maize") would silently drop rows rather than narrow
 * them. The whole set comes back once and the archive filters it in memory —
 * the same rule CalendarListScreen and MarketScreen follow, and the reason
 * both give: it sidesteps the backend's exact-string matching and it works
 * offline.
 */
export async function listArchivedAdvisories(): Promise<AdvisoryResult<ArchivedAdvisory[]>> {
  try {
    const data = await getJson<AdvisoryListDto[]>('/api/weekly-advisories');
    const entries = (data ?? []).map(toArchivedAdvisory);
    // Nothing published is not a failure, and it is not the same as being
    // offline — the archive says something different for each.
    if (entries.length === 0) return { data: MOCK_ADVISORY_ARCHIVE, fallback: 'empty' };
    return { data: entries, fallback: null };
  } catch (error) {
    if (error instanceof NetworkError) return { data: MOCK_ADVISORY_ARCHIVE, fallback: 'offline' };
    throw error;
  }
}

export async function getWeeklyAdvisory(
  advisoryId: number,
  kind: AdvisoryKind,
): Promise<AdvisoryResult<WeeklyAdvisory>> {
  try {
    const data = await getJson<AdvisoryDto>(`/api/weekly-advisories/${advisoryId}`);
    if (!data) return { data: seededAdvisory(kind), fallback: 'empty' };
    return { data: toWeeklyAdvisory(data), fallback: null };
  } catch (error) {
    if (error instanceof NetworkError) return { data: seededAdvisory(kind), fallback: 'offline' };
    throw error;
  }
}
