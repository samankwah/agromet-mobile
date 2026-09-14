import { getJson, NetworkError } from '../http';
import { toUtcIso } from '../openMeteo';

/**
 * Open-Meteo's hourly precipitation over a grid: the model half of the rain
 * timeline, covering the hours the satellite cannot.
 *
 * Two routes to the same data, the same shape `fetchWeatherBundle` uses: through
 * our backend, which caches it, and directly against Open-Meteo when that
 * backend cannot be reached.
 *
 * **The proxy is the point here, not an optimisation.** `fetchCurrentBatch` goes
 * direct and is right to: 32 points for a display strip. This is several
 * hundred, and Open-Meteo weights a request by its location count, so direct
 * from every device it consumes the free tier in proportion to how many people
 * open the screen rather than to time. `backend/app/precip_runtime.py` carries
 * the arithmetic. The direct path stays as a fallback because a farmer whose
 * backend is unreachable should still get a map, and one device occasionally
 * going direct is not what breaks the budget.
 */
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';

export type PrecipField = {
  /** Cell centres, parallel to every column of `values`. Comes back from
   * whichever source answered, because the grid and the values are positional
   * and inferring the lattice separately is how the two silently drift. */
  grid: { lat: number; lng: number }[];
  /** Width of a cell in degrees, for drawing its square. */
  stepDeg: number;
  /** Hourly timestamps, ISO 8601 UTC, ascending. */
  times: string[];
  /** values[hour][cell], in mm over that hour, which at an hourly step is the
   * same number as the mean rate in mm/h. */
  values: number[][];
};

export const OPEN_METEO_ATTRIBUTION = 'Forecast: Open-Meteo (CC BY 4.0)';

type BackendField = {
  grid: [number, number][];
  stepDeg: number;
  times: string[];
  values: number[][];
  unavailable: boolean;
};

export async function fetchPrecipField(
  fallbackGrid: { lat: number; lng: number }[],
  options: { pastDays: number; forecastDays: number; stepDeg: number },
): Promise<PrecipField> {
  try {
    const field = await getJson<BackendField | null>('/api/precipitation/field');
    if (field && !field.unavailable && field.times.length > 0) {
      return {
        grid: field.grid.map(([lat, lng]) => ({ lat, lng })),
        stepDeg: field.stepDeg,
        // The backend already marks these UTC, but it writes them without
        // seconds. Round-tripping through Date gives both routes byte-identical
        // stamps, which matters because a frame is keyed by its `validAt`.
        times: field.times.map((time) => new Date(time).toISOString()),
        values: field.values,
      };
    }
  } catch (error) {
    // A server error is a real answer and is not routed around; only
    // unreachability falls through to the direct call, exactly as
    // `fetchWeatherBundle` does.
    if (!(error instanceof NetworkError)) throw error;
  }

  return fetchDirect(fallbackGrid, options);
}

/**
 * One request for the whole field, straight from Open-Meteo.
 *
 * `past_days` matters as much as the forecast days: the satellite runs about six
 * hours behind, so without the model's own recent hours the timeline has a hole
 * between the last measurement and now.
 */
async function fetchDirect(
  grid: { lat: number; lng: number }[],
  options: { pastDays: number; forecastDays: number; stepDeg: number },
): Promise<PrecipField> {
  if (grid.length === 0) return { grid: [], stepDeg: options.stepDeg, times: [], values: [] };

  const params = new URLSearchParams({
    latitude: grid.map((cell) => cell.lat.toFixed(2)).join(','),
    longitude: grid.map((cell) => cell.lng.toFixed(2)).join(','),
    hourly: 'precipitation',
    timezone: 'UTC',
    past_days: String(options.pastDays),
    forecast_days: String(options.forecastDays),
    cell_selection: 'land',
  });

  let response: Response;
  try {
    response = await fetch(`${FORECAST_URL}?${params.toString()}`);
  } catch {
    throw new NetworkError('Could not reach the forecast service. Check your connection and try again.');
  }
  if (!response.ok) {
    throw new NetworkError('The forecast service is not answering just now. Try again shortly.');
  }

  const body = (await response.json()) as unknown;
  // One coordinate comes back as an object, several as an array. Normalise
  // rather than assume, exactly as `fetchCurrentBatch` does.
  const entries = (Array.isArray(body) ? body : [body]) as {
    hourly?: { time?: string[]; precipitation?: (number | null)[] };
  }[];

  const times = entries[0]?.hourly?.time ?? [];
  if (times.length === 0) throw new NetworkError('The forecast service returned no hours.');

  // Rows are hours, columns are cells: that is the orientation the map wants,
  // because a frame is one hour across every cell.
  const values = times.map((_, hour) =>
    grid.map((__, cell) => {
      const reading = entries[cell]?.hourly?.precipitation?.[hour];
      return typeof reading === 'number' ? reading : 0;
    }),
  );

  // Open-Meteo returns zone-less stamps. Ghana is UTC+0 so the difference never
  // shows in testing here, which is exactly why it has to be explicit.
  return {
    grid,
    stepDeg: options.stepDeg,
    times: times.map((time) => new Date(toUtcIso(time)).toISOString()),
    values,
  };
}
