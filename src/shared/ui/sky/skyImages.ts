import type { ImageSourcePropType } from 'react-native';

import type { SkyBackdrop } from '../../domain/skyScene';

/**
 * The painted skies, one for each kind of weather at each time of day,
 * rendered by `scripts/render-skies.py` into assets/sky. Bundled, so the sky
 * shows offline as well as on.
 */
export const SKY_IMAGES: Record<SkyBackdrop, ImageSourcePropType> = {
  'clear-day': require('../../../../assets/sky/clear-day.webp'),
  'clear-dawn': require('../../../../assets/sky/clear-dawn.webp'),
  'clear-dusk': require('../../../../assets/sky/clear-dusk.webp'),
  'clear-night': require('../../../../assets/sky/clear-night.webp'),
  'partly-day': require('../../../../assets/sky/partly-day.webp'),
  'partly-dawn': require('../../../../assets/sky/partly-dawn.webp'),
  'partly-dusk': require('../../../../assets/sky/partly-dusk.webp'),
  'partly-night': require('../../../../assets/sky/partly-night.webp'),
  'cloudy-day': require('../../../../assets/sky/cloudy-day.webp'),
  'cloudy-dawn': require('../../../../assets/sky/cloudy-dawn.webp'),
  'cloudy-dusk': require('../../../../assets/sky/cloudy-dusk.webp'),
  'cloudy-night': require('../../../../assets/sky/cloudy-night.webp'),
  'overcast-day': require('../../../../assets/sky/overcast-day.webp'),
  'overcast-dawn': require('../../../../assets/sky/overcast-dawn.webp'),
  'overcast-dusk': require('../../../../assets/sky/overcast-dusk.webp'),
  'overcast-night': require('../../../../assets/sky/overcast-night.webp'),
  'rain-day': require('../../../../assets/sky/rain-day.webp'),
  'rain-dawn': require('../../../../assets/sky/rain-dawn.webp'),
  'rain-dusk': require('../../../../assets/sky/rain-dusk.webp'),
  'rain-night': require('../../../../assets/sky/rain-night.webp'),
  'storm-day': require('../../../../assets/sky/storm-day.webp'),
  'storm-dawn': require('../../../../assets/sky/storm-dawn.webp'),
  'storm-dusk': require('../../../../assets/sky/storm-dusk.webp'),
  'storm-night': require('../../../../assets/sky/storm-night.webp'),
  'fog-day': require('../../../../assets/sky/fog-day.webp'),
  'fog-dawn': require('../../../../assets/sky/fog-dawn.webp'),
  'fog-dusk': require('../../../../assets/sky/fog-dusk.webp'),
  'fog-night': require('../../../../assets/sky/fog-night.webp'),
};
