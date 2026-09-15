import type { ImageSourcePropType } from 'react-native';

/**
 * The 3D icon set, addressed by the role it plays rather than by what it
 * depicts.
 *
 * `market` rather than `label`, `wind` rather than `dashing-away`. The art is
 * the replaceable half: if a better market icon turns up, only this file and
 * `assets/icons3d/CREDITS.md` change, and no screen has to be edited to follow
 * it. Naming the role also keeps the call sites readable — a stat tile asking
 * for `humidity` says what it means in a way `droplet` does not.
 *
 * Every path is a literal inside `require`, which Metro needs in order to see
 * the asset at build time. A computed path silently resolves to nothing, so the
 * map has to be written out rather than generated.
 *
 * Licensing lives in `assets/icons3d/CREDITS.md` — MIT, Microsoft Fluent Emoji.
 */
export type ClayIconName =
  // Sky conditions. One per `domain/weatherGlyph.ts` glyph, plus the two night
  // forms. See `ui/weather/LiveWeatherIcon.tsx` for the mapping and for the two
  // places it is knowingly lossy.
  | 'sun'
  | 'moon'
  | 'sun-small-cloud'
  | 'sun-cloud'
  | 'cloud'
  | 'fog'
  | 'sun-rain-cloud'
  | 'cloud-rain'
  | 'cloud-lightning-rain'
  // Navigation and features.
  | 'home'
  | 'forecasts'
  | 'advisories'
  | 'farm-tools'
  | 'consult'
  | 'diagnose'
  | 'market'
  // Measurements, for stat tiles.
  | 'temperature'
  | 'humidity'
  | 'wind'
  | 'rainfall'
  // Content.
  | 'crop'
  | 'calendar'
  | 'poultry-calendar'
  | 'storage'
  | 'poultry'
  | 'prices'
  | 'trend'
  | 'warning'
  | 'reminders'
  | 'archive';

export const clayIcons: Record<ClayIconName, ImageSourcePropType> = {
  sun: require('../../../../assets/icons3d/sun.png'),
  moon: require('../../../../assets/icons3d/moon.png'),
  'sun-small-cloud': require('../../../../assets/icons3d/sun-small-cloud.png'),
  'sun-cloud': require('../../../../assets/icons3d/sun-cloud.png'),
  cloud: require('../../../../assets/icons3d/cloud.png'),
  fog: require('../../../../assets/icons3d/fog.png'),
  'sun-rain-cloud': require('../../../../assets/icons3d/sun-rain-cloud.png'),
  'cloud-rain': require('../../../../assets/icons3d/cloud-rain.png'),
  'cloud-lightning-rain': require('../../../../assets/icons3d/cloud-lightning-rain.png'),

  home: require('../../../../assets/icons3d/house.png'),
  forecasts: require('../../../../assets/icons3d/sun-cloud.png'),
  advisories: require('../../../../assets/icons3d/megaphone.png'),
  'farm-tools': require('../../../../assets/icons3d/hammer-wrench.png'),
  consult: require('../../../../assets/icons3d/robot.png'),
  diagnose: require('../../../../assets/icons3d/camera.png'),
  market: require('../../../../assets/icons3d/shopping-cart.png'),

  temperature: require('../../../../assets/icons3d/thermometer.png'),
  humidity: require('../../../../assets/icons3d/droplet.png'),
  wind: require('../../../../assets/icons3d/wind.png'),
  rainfall: require('../../../../assets/icons3d/cloud-rain.png'),

  crop: require('../../../../assets/icons3d/seedling.png'),
  calendar: require('../../../../assets/icons3d/calendar.png'),
  // A second calendar rather than a second egg. The poultry *advisory* keeps
  // the egg; this is the poultry *calendar*, and a tile that says calendar
  // should look like one. The spiral binding is what tells the two calendars
  // apart at tile size.
  'poultry-calendar': require('../../../../assets/icons3d/spiral-calendar.png'),
  storage: require('../../../../assets/icons3d/package.png'),
  poultry: require('../../../../assets/icons3d/egg.png'),
  prices: require('../../../../assets/icons3d/money-bag.png'),
  trend: require('../../../../assets/icons3d/chart-increasing.png'),
  warning: require('../../../../assets/icons3d/warning.png'),
  reminders: require('../../../../assets/icons3d/bell.png'),
  archive: require('../../../../assets/icons3d/clipboard.png'),
};
