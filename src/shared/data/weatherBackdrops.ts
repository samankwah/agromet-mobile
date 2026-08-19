import type { ImageSourcePropType } from 'react-native';

import { classifyCondition, isDaytime, type ConditionKind } from '../utils/classifyCondition';

/**
 * Photographic backdrops for the Daily view — every one taken in Ghana,
 * so a farmer sees skies over Tamale, Kumasi or the Northern wetlands
 * rather than generic stock.
 *
 * Bundled rather than fetched: this app targets intermittent rural
 * connectivity, and a backdrop that fails to load offline would be worse
 * than none. All six total ~560KB, which is an acceptable one-off app-size
 * cost for something on the primary screen.
 *
 * Every image is Creative Commons and **requires attribution**. The credit
 * travels with the asset here, in the same record the renderer uses, so
 * the two cannot drift apart — see also assets/weather/CREDITS.md.
 */
export type WeatherBackdrop = {
  source: ImageSourcePropType;
  /** Shown in-app as the required photo credit. */
  credit: string;
  licence: string;
  /** Where the photo was taken, surfaced so the imagery reads as local. */
  place: string;
};

const CLEAR_DAY: WeatherBackdrop = {
  source: require('../../../assets/weather/clear-day.jpg'),
  credit: 'Sheihu Salawatia / Wikimedia Commons',
  licence: 'CC BY-SA 4.0',
  place: 'Northern Ghana',
};

const CLOUDY_DAY: WeatherBackdrop = {
  source: require('../../../assets/weather/cloudy-day.jpg'),
  credit: 'Sunsetsrains / Wikimedia Commons',
  licence: 'CC BY-SA 4.0',
  place: 'Ghana',
};

const OVERCAST_DAY: WeatherBackdrop = {
  source: require('../../../assets/weather/overcast-day.jpg'),
  credit: 'Adwoa Gifty / Wikimedia Commons',
  licence: 'CC BY-SA 4.0',
  place: 'Ghana',
};

const RAIN_DAY: WeatherBackdrop = {
  source: require('../../../assets/weather/rain-day.jpg'),
  credit: 'Seimawu Sugri Seidu / Wikimedia Commons',
  licence: 'CC BY-SA 4.0',
  place: 'Dungu, Tamale',
};

const THUNDERSTORM: WeatherBackdrop = {
  source: require('../../../assets/weather/thunderstorm.jpg'),
  credit: 'Adwoa Gifty / Wikimedia Commons',
  licence: 'CC BY-SA 4.0',
  place: 'Ghana',
};

/** One night backdrop for every condition: after dark the sky reads as
 * sky, and cloud detail isn't distinguishable anyway. */
const NIGHT: WeatherBackdrop = {
  source: require('../../../assets/weather/night.jpg'),
  credit: 'Maame1Yaa / Wikimedia Commons',
  licence: 'CC BY-SA 4.0',
  place: 'Kumasi',
};

const DAY_BACKDROPS: Record<ConditionKind, WeatherBackdrop> = {
  clear: CLEAR_DAY,
  cloudy: CLOUDY_DAY,
  overcast: OVERCAST_DAY,
  rain: RAIN_DAY,
  thunderstorm: THUNDERSTORM,
  // A condition that names itself as night takes the night photo whatever
  // the observation time says — the string is the more specific signal.
  'clear-night': NIGHT,
  'cloudy-night': NIGHT,
};

/** Every backdrop, for a credits screen. */
export const ALL_BACKDROPS: WeatherBackdrop[] = [CLEAR_DAY, CLOUDY_DAY, OVERCAST_DAY, RAIN_DAY, THUNDERSTORM, NIGHT];

export function getWeatherBackdrop(condition: string, observedAt: string): WeatherBackdrop {
  if (!isDaytime(observedAt)) return NIGHT;
  return DAY_BACKDROPS[classifyCondition(condition)];
}
