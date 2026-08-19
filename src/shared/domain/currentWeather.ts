/**
 * Current conditions for a single location. Field names are chosen to be
 * unambiguous about units (the app is metric-only — °C, mm, km/h) rather
 * than mirroring the web app's Open-Meteo-derived field names 1:1; a future
 * real integration maps Open-Meteo's `temperature_2m`/`apparent_temperature`
 * etc. onto this shape in one service function (shared/api/weatherService.ts)
 * rather than every screen dealing with raw provider field names.
 */
export type CurrentWeather = {
  locationId: string;
  locationName: string;
  /** Coordinates + region — needed so map-layer/forecast features can share
   * location context with Home without a second lookup, and to match the
   * web app's per-city shape (frontend/src/pages/Home.jsx ghanaCities). */
  lat: number;
  lng: number;
  region: string;
  observedAt: string; // ISO 8601
  temperatureC: number;
  minC: number;
  maxC: number;
  feelsLikeC: number;
  condition: string; // short human label, e.g. "Partly cloudy"
  rainfallMm: number;
  humidityPct: number;
  windKph: number;
};
