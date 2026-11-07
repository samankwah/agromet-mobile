import { sunTimes } from '../utils/sun';
import { glyphFromWmo, type WeatherGlyph } from './weatherGlyph';

/**
 * What the sky behind the forecast should look like, worked out from the
 * current reading.
 *
 * Driven by measurements, not by a weather label: Open-Meteo's cloud cover at
 * three heights decides how much cloud is drawn and where, the visibility
 * decides the haze, and the time decides the light. Fifteen percent low cloud
 * is a few scattered puffs on blue; a hundred percent is the flat grey sheet of
 * a wet afternoon. The renderer (`ui/sky/AnimatedSky.tsx`) only shows what this
 * decides, so every rule is a plain unit test here.
 *
 * Rain and lightning still come from the WMO code through `glyphFromWmo`, the
 * mapping the condition icon uses, so the icon and the sky agree.
 */
export type SkyPhase = 'dawn' | 'day' | 'dusk' | 'night';

export type Precipitation = 'none' | 'drizzle' | 'rain' | 'heavy';

/** An RGB colour with channels from 0 to 1, as the shader takes it. */
export type Rgb = [number, number, number];

export type CloudCover = { total: number; low: number; mid: number; high: number };

/** The kinds of sky there is a painted picture for (`scripts/render-skies.py`). */
export type SkyKind = 'clear' | 'partly' | 'cloudy' | 'overcast' | 'rain' | 'storm' | 'fog';

/** Which picture: a kind of sky at a time of day, e.g. "partly-dusk". */
export type SkyBackdrop = `${SkyKind}-${SkyPhase}`;

export type SkyReading = {
  weatherCode: number;
  /** The moment to draw the sky for: now, not when the reading was taken. A
   * reading half an hour old must not hold the sky at that afternoon. */
  at: Date;
  /** Where, for the real sunrise and sunset. */
  lat: number;
  lng: number;
  /** Percent, from Open-Meteo. Absent on data saved before it was fetched. */
  cloudCover?: CloudCover;
  /** Metres. */
  visibilityM?: number;
};

export type SkyScene = {
  phase: SkyPhase;
  /** The painted sky to show. */
  kind: SkyKind;
  backdrop: SkyBackdrop;
  glyph: WeatherGlyph;
  /** Fraction of the sky covered at each height, 0 to 1. */
  cover: { low: number; mid: number; high: number };
  /** Whether `cover` came from the measurement or was estimated from the code. */
  measured: boolean;
  skyTop: Rgb;
  skyBottom: Rgb;
  /** Cloud colour where the light falls on it, and in its own shadow. */
  cloudLit: Rgb;
  cloudShade: Rgb;
  /** Dust or mist over everything, 0 to 1, and its colour. */
  haze: number;
  hazeColour: Rgb;
  /** Brightness of the sun's glow, 0 to 1. Zero at night and under thick cloud. */
  sunGlow: number;
  /** How many stars show, 0 to 1. Night only, hidden by cloud. */
  stars: number;
  precip: Precipitation;
  lightning: boolean;
  /** The see-through colour for cards over this sky, as CSS. */
  glass: string;
};

// ---------------------------------------------------------------------------
// Time of day
// ---------------------------------------------------------------------------

/**
 * Dawn and dusk around the real sunrise and sunset for the place
 * (`utils/sun.ts`), in minutes either side.
 *
 * The warm light starts a little before the sun goes down and is gone within
 * half an hour of it, which is when the sky should be night. Fixed clock
 * windows (17:30 to 19:00) kept the sky in a glowing dusk for over an hour
 * after the sun had set.
 */
const DAWN_BEFORE_MIN = 30;
const DAWN_AFTER_MIN = 45;
const DUSK_BEFORE_MIN = 45;
const DUSK_AFTER_MIN = 25;

export function skyPhase(at: Date, lat: number, lng: number): SkyPhase {
  const times = sunTimes(at, lat, lng);
  const now = at.getTime();
  if (!times || Number.isNaN(now)) {
    // No answer from the equations (never in Ghana): a plain six-to-six day.
    const hour = at.getHours();
    return hour >= 6 && hour < 18 ? 'day' : 'night';
  }
  const minute = 60_000;
  if (now >= times.sunrise - DAWN_BEFORE_MIN * minute && now < times.sunrise + DAWN_AFTER_MIN * minute) return 'dawn';
  if (now >= times.sunset - DUSK_BEFORE_MIN * minute && now < times.sunset + DUSK_AFTER_MIN * minute) return 'dusk';
  return now > times.sunrise && now < times.sunset ? 'day' : 'night';
}

/** Whether the sun itself is above the horizon, for its glow. */
function sunIsUp(at: Date, lat: number, lng: number): boolean {
  const times = sunTimes(at, lat, lng);
  if (!times) return at.getHours() >= 6 && at.getHours() < 18;
  return at.getTime() > times.sunrise && at.getTime() < times.sunset;
}

// ---------------------------------------------------------------------------
// Cloud amount
// ---------------------------------------------------------------------------

/**
 * A stand-in for the measurement, from the weather code alone. Only used when
 * the reading has no cloud cover (data saved before it was fetched), so a
 * storm still draws a full sky rather than a clear one.
 */
const ESTIMATE: Record<WeatherGlyph, { low: number; mid: number; high: number }> = {
  clear: { low: 0.05, mid: 0, high: 0.05 },
  'partly-cloudy': { low: 0.2, mid: 0.05, high: 0.1 },
  cloudy: { low: 0.45, mid: 0.2, high: 0.15 },
  overcast: { low: 0.9, mid: 0.6, high: 0.3 },
  fog: { low: 0.3, mid: 0.1, high: 0 },
  drizzle: { low: 0.85, mid: 0.5, high: 0.3 },
  rain: { low: 0.9, mid: 0.7, high: 0.4 },
  showers: { low: 0.8, mid: 0.6, high: 0.3 },
  'heavy-rain': { low: 1, mid: 0.85, high: 0.5 },
  thunderstorm: { low: 1, mid: 0.9, high: 0.6 },
};

const PRECIP: Record<WeatherGlyph, Precipitation> = {
  clear: 'none',
  'partly-cloudy': 'none',
  cloudy: 'none',
  overcast: 'none',
  fog: 'none',
  drizzle: 'drizzle',
  rain: 'rain',
  showers: 'rain',
  'heavy-rain': 'heavy',
  thunderstorm: 'heavy',
};

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

// ---------------------------------------------------------------------------
// Colour
// ---------------------------------------------------------------------------

const hex = (value: string): Rgb => [
  parseInt(value.slice(1, 3), 16) / 255,
  parseInt(value.slice(3, 5), 16) / 255,
  parseInt(value.slice(5, 7), 16) / 255,
];

const mix = (a: Rgb, b: Rgb, t: number): Rgb => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

type Palette = { top: string; bottom: string; lit: string; shade: string };

/**
 * Each phase has a clear sky and a grey one, and the scene sits between them
 * by how cloudy it is. Grey because that is what thick cloud does to daylight:
 * a blue sky with a few grey shapes on it is the look this replaced, and it
 * read as fine weather on a day with an 88% chance of rain.
 */
const CLEAR: Record<SkyPhase, Palette> = {
  day: { top: '#2560a8', bottom: '#6fa3d6', lit: '#ffffff', shade: '#aebccb' },
  dawn: { top: '#33507f', bottom: '#e9a46e', lit: '#ffdcbc', shade: '#8f7f8f' },
  dusk: { top: '#29315f', bottom: '#e0875c', lit: '#f8c3a0', shade: '#6f6378' },
  night: { top: '#071022', bottom: '#1c2d4f', lit: '#56627a', shade: '#1d2433' },
};

const GREY: Record<SkyPhase, Palette> = {
  day: { top: '#59636d', bottom: '#8c959d', lit: '#c4cad0', shade: '#737c85' },
  dawn: { top: '#4f5562', bottom: '#8d8580', lit: '#b9b0aa', shade: '#666670' },
  dusk: { top: '#44485a', bottom: '#7e7276', lit: '#a99c9c', shade: '#5a5664' },
  night: { top: '#12161c', bottom: '#262c35', lit: '#3d4450', shade: '#191e26' },
};

/** A storm darkens the grey further: the underside of a cumulonimbus. */
const STORM: Palette = { top: '#30373e', bottom: '#525a61', lit: '#858d94', shade: '#3d444a' };

const HAZE_DAY = '#cdc5b6'; // harmattan dust is beige, not white
const HAZE_NIGHT = '#3a3f47';

/** Visibility at and above which the air counts as clear, and at which it is
 * thick. Harmattan days in the north often sit at two to five kilometres. */
const CLEAR_VISIBILITY_M = 10_000;
const THICK_VISIBILITY_M = 1_000;

function toCss([r, g, b]: Rgb, alpha: number): string {
  return `rgba(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)},${alpha})`;
}

// ---------------------------------------------------------------------------
// Scene
// ---------------------------------------------------------------------------

export function skyScene(reading: SkyReading): SkyScene {
  const phase = skyPhase(reading.at, reading.lat, reading.lng);
  const glyph = glyphFromWmo(reading.weatherCode);
  const precip = PRECIP[glyph];
  const lightning = glyph === 'thunderstorm';

  const measured = reading.cloudCover !== undefined;
  const cover = reading.cloudCover
    ? {
        low: clamp01(reading.cloudCover.low / 100),
        mid: clamp01(reading.cloudCover.mid / 100),
        high: clamp01(reading.cloudCover.high / 100),
      }
    : ESTIMATE[glyph];
  const total = reading.cloudCover ? clamp01(reading.cloudCover.total / 100) : clamp01(Math.max(cover.low, cover.mid, cover.high * 0.6));

  // How grey the light is. Thin cloud leaves the sky blue; from about 55%
  // cover it greys, and falling rain means a thick deck whatever the figures.
  let grey = clamp01((total - 0.55) / 0.35);
  if (precip !== 'none') grey = Math.max(grey, 0.95);

  const clear = CLEAR[phase];
  const dull = lightning || precip === 'heavy' ? (phase === 'night' ? GREY.night : STORM) : GREY[phase];
  const skyTop = mix(hex(clear.top), hex(dull.top), grey);
  const skyBottom = mix(hex(clear.bottom), hex(dull.bottom), grey);
  const cloudLit = mix(hex(clear.lit), hex(dull.lit), grey);
  const cloudShade = mix(hex(clear.shade), hex(dull.shade), grey);

  let haze = 0;
  if (typeof reading.visibilityM === 'number') {
    haze = clamp01((CLEAR_VISIBILITY_M - reading.visibilityM) / (CLEAR_VISIBILITY_M - THICK_VISIBILITY_M)) * 0.85;
  }
  if (glyph === 'fog') haze = Math.max(haze, 0.9);

  // The glow only while the sun is actually up; after sunset the warm dusk
  // colours carry the light, and the first stars come out.
  const up = sunIsUp(reading.at, reading.lat, reading.lng);
  const sunGlow = !up ? 0 : Math.pow(1 - total, 1.5) * (phase === 'day' ? 1 : 0.6);
  const stars = phase === 'night' ? Math.pow(1 - total, 2) : !up && phase === 'dusk' ? 0.3 * Math.pow(1 - total, 2) : 0;

  // Which painting. Weather that falls or blinds wins over the cover figures:
  // a storm with a gap in the cloud is still a storm. Otherwise the measured
  // cover decides, from a clear sky through a few clouds to a full deck.
  const kind: SkyKind =
    glyph === 'thunderstorm'
      ? 'storm'
      : precip !== 'none'
        ? 'rain'
        : glyph === 'fog' || haze >= 0.45
          ? 'fog'
          : total < 0.12
            ? 'clear'
            : total < 0.45
              ? 'partly'
              : total < 0.78
                ? 'cloudy'
                : 'overcast';

  // Cards over the sky are a darker, see-through version of its top colour, so
  // they take on the weather: grey glass on a grey day, blue on a clear one.
  const glass = toCss(mix(skyTop, [0, 0, 0], 0.45), 0.42);

  return {
    phase,
    kind,
    backdrop: `${kind}-${phase}`,
    glyph,
    cover,
    measured,
    skyTop,
    skyBottom,
    cloudLit,
    cloudShade,
    haze,
    hazeColour: hex(phase === 'night' ? HAZE_NIGHT : HAZE_DAY),
    sunGlow,
    stars,
    precip,
    lightning,
    glass,
  };
}
