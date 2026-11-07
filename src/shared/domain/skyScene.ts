import { glyphFromWmo, type WeatherGlyph } from './weatherGlyph';

/**
 * What the sky behind the forecast should show, worked out from the reading.
 *
 * Kept free of React so every rule here is a plain unit test: the renderer in
 * `ui/sky/AnimatedSky.tsx` only draws what this decides. The weather comes from
 * `glyphFromWmo`, the same mapping the condition icon uses, so the icon and the
 * sky can never disagree about whether it is raining.
 */
export type SkyPhase = 'dawn' | 'day' | 'dusk' | 'night';

export type CloudTone = 'light' | 'grey' | 'dark';

export type Precipitation = 'none' | 'drizzle' | 'rain' | 'heavy';

export type SkyScene = {
  phase: SkyPhase;
  glyph: WeatherGlyph;
  /** Top, middle and bottom of the sky. */
  gradient: [string, string, string];
  clouds: { count: number; tone: CloudTone };
  precip: Precipitation;
  lightning: boolean;
  fog: boolean;
  sun: boolean;
  stars: boolean;
};

/**
 * Dawn and dusk by the clock, in minutes past midnight.
 *
 * Ghana sits between 5°N and 11°N, so sunrise stays near 06:00 and sunset near
 * 18:00 all year. `utils/classifyCondition.ts` relies on the same fact for its
 * day test. The windows straddle those times, so the warm colours show for the
 * half hour either side, which is when the real sky has them.
 */
const DAWN = { from: 5 * 60 + 30, to: 7 * 60 };
const DUSK = { from: 17 * 60 + 30, to: 19 * 60 };

export function skyPhase(isDay: boolean, observedAt: string): SkyPhase {
  const date = new Date(observedAt);
  const minutes = Number.isNaN(date.getTime()) ? 12 * 60 : date.getHours() * 60 + date.getMinutes();

  if (minutes >= DAWN.from && minutes < DAWN.to) return 'dawn';
  if (minutes >= DUSK.from && minutes < DUSK.to) return 'dusk';
  // Open-Meteo's own day flag decides the rest, so a reading taken at 05:00
  // or 20:00 is night even if the clock maths were ever off by a little.
  return isDay ? 'day' : 'night';
}

/** How heavy the cloud cover is, which picks the sky's colours. */
type Cover = 'clear' | 'some' | 'grey' | 'rain' | 'storm' | 'fog';

const COVER: Record<WeatherGlyph, Cover> = {
  clear: 'clear',
  'partly-cloudy': 'some',
  cloudy: 'some',
  overcast: 'grey',
  fog: 'fog',
  drizzle: 'rain',
  rain: 'rain',
  showers: 'rain',
  'heavy-rain': 'storm',
  thunderstorm: 'storm',
};

/**
 * Sky colours, top to bottom.
 *
 * Every set is dark enough at the top for the white temperature and place name
 * that sit there. A light Apple-style pastel would look prettier and fail in
 * Ghanaian midday sun, which is when farmers read this.
 */
const GRADIENTS: Record<SkyPhase, Record<Cover, [string, string, string]>> = {
  day: {
    clear: ['#1d5ba3', '#3878bd', '#62a0d4'],
    some: ['#295f9c', '#4a80b8', '#78a5cc'],
    grey: ['#47586a', '#627385', '#8494a4'],
    fog: ['#66737f', '#838f9a', '#a0aab3'],
    rain: ['#384757', '#4d5d6d', '#687886'],
    storm: ['#1d252e', '#2c3743', '#414d5a'],
  },
  dawn: {
    clear: ['#2b4677', '#b9706c', '#eca46a'],
    some: ['#34466e', '#9c6a72', '#d4966f'],
    grey: ['#3d4759', '#6d6a72', '#9d8a80'],
    fog: ['#57606e', '#857f84', '#b09d93'],
    rain: ['#323b4a', '#555864', '#7a7276'],
    storm: ['#1c222b', '#30353f', '#4a4a52'],
  },
  dusk: {
    clear: ['#222d5b', '#874c78', '#e2855a'],
    some: ['#29325a', '#7a5276', '#c97d5f'],
    grey: ['#353b52', '#625a6a', '#93786f'],
    fog: ['#4f5568', '#7a7180', '#a68b84'],
    rain: ['#2c3244', '#4d4b5c', '#73666b'],
    storm: ['#191d27', '#2b2d38', '#45414a'],
  },
  night: {
    clear: ['#060c1d', '#0e1b37', '#1b2d52'],
    some: ['#0b1324', '#16223a', '#26364f'],
    grey: ['#10161f', '#1b2533', '#2a3646'],
    fog: ['#1a2029', '#28303b', '#3a434f'],
    rain: ['#0c1118', '#161e29', '#24303e'],
    storm: ['#080b11', '#11161e', '#1e2530'],
  },
};

const CLOUDS: Record<WeatherGlyph, SkyScene['clouds']> = {
  clear: { count: 0, tone: 'light' },
  'partly-cloudy': { count: 2, tone: 'light' },
  cloudy: { count: 3, tone: 'light' },
  overcast: { count: 4, tone: 'grey' },
  fog: { count: 2, tone: 'grey' },
  drizzle: { count: 3, tone: 'grey' },
  rain: { count: 4, tone: 'grey' },
  showers: { count: 3, tone: 'grey' },
  'heavy-rain': { count: 4, tone: 'dark' },
  thunderstorm: { count: 4, tone: 'dark' },
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

/** The weathers light enough to see the sun, moon or stars through. */
const SEE_THROUGH: ReadonlySet<WeatherGlyph> = new Set(['clear', 'partly-cloudy', 'cloudy']);

export function skyScene(reading: { weatherCode: number; isDay: boolean; observedAt: string }): SkyScene {
  const phase = skyPhase(reading.isDay, reading.observedAt);
  const glyph = glyphFromWmo(reading.weatherCode);
  const seeThrough = SEE_THROUGH.has(glyph);

  return {
    phase,
    glyph,
    gradient: GRADIENTS[phase][COVER[glyph]],
    clouds: CLOUDS[glyph],
    precip: PRECIP[glyph],
    lightning: glyph === 'thunderstorm',
    fog: glyph === 'fog',
    sun: seeThrough && phase !== 'night',
    stars: seeThrough && phase === 'night',
  };
}
