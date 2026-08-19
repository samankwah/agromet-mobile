import { MOCK_CALENDARS, MOCK_CALENDAR_ACTIVITIES } from '../data/mockCalendars';
import type { Calendar, CalendarActivity, CalendarKind, CalendarMetadata, ProductionCycle } from '../domain/calendar';
import { calendarTypeFor } from '../domain/calendar';
import { getJson, NetworkError, postJson, putJson } from './http';

/**
 * Calendars, over real HTTP — the app's first live backend integration.
 *
 * Where a read finds nothing — or cannot reach the server — it falls back
 * to seeded sample calendars and says which of the two happened. That
 * isn't belt-and-braces: the database holds one crop calendar and no
 * poultry calendars at all, so without it the poultry screen would ship
 * permanently blank.
 */

/**
 * `fallback` records *why* sample data is being shown, because the two
 * reasons need different words on screen:
 *
 *   'empty'   the server answered, and has nothing published yet
 *   'offline' the server could not be reached
 *
 * The distinction is what keeps a misconfigured base URL visible. A silent
 * fallback would make the app look perfect on every machine while quietly
 * never talking to the backend at all; saying "couldn't reach the server"
 * on screen makes that impossible to miss, without leaving the farmer
 * staring at an error they can do nothing about.
 */
export type FallbackReason = 'empty' | 'offline' | null;

export type CalendarResult<T> = { data: T; fallback: FallbackReason };

/**
 * A list result keeps the live calendars and the samples apart rather than
 * choosing between them up front. The backend may hold a calendar for one
 * crop and district and nothing for the next; deciding "live or sample"
 * for the whole request would hide every sample the moment a single real
 * calendar existed. The screen picks per selection instead.
 */
export type CalendarListResult = { data: Calendar[]; samples: Calendar[]; fallback: FallbackReason };

export type CalendarFilter = {
  kind: CalendarKind;
  commodity?: string;
  regionCode?: string;
  districtCode?: string;
  year?: number;
  search?: string;
};

function mockFor(kind: CalendarKind): Calendar[] {
  const type = calendarTypeFor(kind);
  return MOCK_CALENDARS.filter((entry) => entry.calendarType === type);
}

function matchesFilter(entry: Calendar, filter: CalendarFilter): boolean {
  if (filter.commodity && entry.commodity.toLowerCase() !== filter.commodity.toLowerCase()) return false;
  if (filter.regionCode && entry.regionCode !== filter.regionCode) return false;
  if (filter.districtCode && entry.districtCode !== filter.districtCode) return false;
  return true;
}

/** The wire shape carries the season only inside the uploaded workbook's
 * sheet names, so it is lifted onto the domain type here rather than left
 * for each screen to dig out of `fileData`. */
type CalendarWire = Calendar & {
  fileData?: { sheets?: { name?: string }[] };
  majorSeason?: { startMonth?: string };
};

function withSeasons(entry: CalendarWire): Calendar {
  const seasons = (entry.fileData?.sheets ?? []).map((sheet) => (sheet.name ?? '').trim()).filter((name) => name.length > 0);
  return {
    ...entry,
    seasons: [...new Set(seasons)],
    seasonStartMonth: entry.majorSeason?.startMonth ?? entry.seasonStartMonth ?? null,
  };
}

export async function listCalendars(filter: CalendarFilter): Promise<CalendarListResult> {
  const samples = mockFor(filter.kind).filter((entry) => matchesFilter(entry, filter));

  try {
    const data = await getJson<CalendarWire[]>('/api/enhanced-calendars', {
      calendarType: calendarTypeFor(filter.kind),
      commodity: filter.commodity,
      regionCode: filter.regionCode,
      districtCode: filter.districtCode,
      year: filter.year,
      search: filter.search,
    });
    return { data: data.map(withSeasons), samples, fallback: null };
  } catch (error) {
    // A genuine server rejection (a 4xx) is a bug worth surfacing; an
    // unreachable server is an everyday condition in the field.
    if (error instanceof NetworkError) return { data: [], samples, fallback: 'offline' };
    throw error;
  }
}

/**
 * Calendar and its activities in ONE request — `GET /api/enhanced-calendars/{id}`
 * embeds `activities` (backend/app/main.py:1510). The web client fetches the
 * list and then one activities request per listed calendar; that fan-out is
 * self-inflicted and painful on mobile data, so it isn't copied here.
 */
export async function getCalendarDetail(id: string): Promise<CalendarResult<{ calendar: Calendar; activities: CalendarActivity[] }>> {
  const local = MOCK_CALENDARS.find((entry) => entry.id === id);
  if (local) {
    // A sample id cannot exist server-side — don't spend a request on it.
    return { data: { calendar: local, activities: MOCK_CALENDAR_ACTIVITIES[id] ?? [] }, fallback: 'empty' };
  }

  const body = await getJson<CalendarWire & { activities?: CalendarActivity[] }>(`/api/enhanced-calendars/${id}`);
  const { activities = [], ...calendar } = body;
  return { data: { calendar: withSeasons(calendar), activities }, fallback: null };
}

export async function getCalendarMetadata(): Promise<CalendarResult<CalendarMetadata>> {
  try {
    return { data: await getJson<CalendarMetadata>('/api/enhanced-calendars/metadata'), fallback: null };
  } catch {
    // Derived from the fallback calendars so the filters still offer exactly
    // what can be selected.
    return {
      data: {
        commodities: [...new Set(MOCK_CALENDARS.map((entry) => entry.commodity))].sort(),
        regions: [...new Set(MOCK_CALENDARS.map((entry) => entry.regionCode))].sort(),
        districts: [...new Set(MOCK_CALENDARS.map((entry) => entry.districtCode))].sort(),
        calendarTypes: ['seasonal', 'cycle'],
        totalCalendars: MOCK_CALENDARS.length,
      },
      fallback: 'offline',
    };
  }
}

// --- Production cycles ---

export type StartCycleInput = {
  calendarId: string;
  startDate: string;
  batchName: string;
  initialQuantity: number;
  notes?: string;
};

export async function startProductionCycle(input: StartCycleInput): Promise<ProductionCycle> {
  return postJson<ProductionCycle>('/api/production-cycles', {
    calendarId: Number(input.calendarId),
    startDate: input.startDate,
    batchName: input.batchName,
    initialQuantity: input.initialQuantity,
    notes: input.notes ?? null,
  });
}

/** Pause, resume or finish a running batch. The server recomputes
 * currentWeek/progressPercent from the new status, so the response is the
 * source of truth for the card that renders it. */
export async function updateProductionCycle(
  cycleId: string,
  changes: { status?: ProductionCycle['status']; currentQuantity?: number; notes?: string },
): Promise<ProductionCycle> {
  return putJson<ProductionCycle>(`/api/production-cycles/${cycleId}`, changes);
}

export async function listProductionCycles(): Promise<ProductionCycle[]> {
  try {
    return await getJson<ProductionCycle[]>('/api/production-cycles');
  } catch {
    return [];
  }
}
