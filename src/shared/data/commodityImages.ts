import type { ImageSourcePropType } from 'react-native';

/**
 * Commodity photographs, bundled with the app.
 *
 * Metro resolves `require` of an asset at build time, so the paths cannot be
 * built from a slug at runtime — hence the explicit map rather than a
 * `require('../../assets/commodities/' + slug)`. Keys are catalogue slugs.
 *
 * The files are the same photographs the web market uses
 * (frontend/src/assets/images), renamed to their slug.
 */
const IMAGES: Record<string, ImageSourcePropType> = {
  'yellow-maize': require('../../../assets/commodities/yellow-maize.jpg'),
  'white-maize': require('../../../assets/commodities/white-maize.png'),
  'yellow-soybeans': require('../../../assets/commodities/yellow-soybeans.jpg'),
  yam: require('../../../assets/commodities/yam.jpg'),
  tomatoes: require('../../../assets/commodities/tomatoes.jpg'),
  rice: require('../../../assets/commodities/rice.jpg'),
  'black-cobra-pepper': require('../../../assets/commodities/black-cobra-pepper.jpg'),
  'anaheim-pepper': require('../../../assets/commodities/anaheim-pepper.jpg'),
  'aleppo-pepper': require('../../../assets/commodities/aleppo-pepper.jpg'),
  'red-onion': require('../../../assets/commodities/red-onion.jpg'),
  'white-onion': require('../../../assets/commodities/white-onion.png'),
  'yellow-onion': require('../../../assets/commodities/yellow-onion.jpg'),
  'dressed-chicken': require('../../../assets/commodities/dressed-chicken.png'),
  'live-chicken': require('../../../assets/commodities/live-chicken.jpg'),
  beans: require('../../../assets/commodities/beans.jpg'),
  plantain: require('../../../assets/commodities/plantain.png'),
  cassava: require('../../../assets/commodities/cassava.jpg'),
  sorghum: require('../../../assets/commodities/sorghum.jpg'),
};

export function commodityImage(slug: string): ImageSourcePropType | undefined {
  return IMAGES[slug];
}
