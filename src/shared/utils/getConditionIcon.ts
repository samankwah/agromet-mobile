import type { Ionicons } from '@expo/vector-icons';

import { classifyCondition, type ConditionKind } from './classifyCondition';

const ICON_BY_KIND: Record<ConditionKind, keyof typeof Ionicons.glyphMap> = {
  thunderstorm: 'thunderstorm-outline',
  rain: 'rainy-outline',
  overcast: 'cloud-outline',
  cloudy: 'partly-sunny-outline',
  clear: 'sunny-outline',
  'clear-night': 'moon-outline',
  'cloudy-night': 'cloudy-night-outline',
};

/**
 * Maps a condition string to an Ionicons name, via the shared
 * `classifyCondition` so the icon and the weather backdrop always agree
 * about what a given condition is.
 */
export function getConditionIcon(condition: string): keyof typeof Ionicons.glyphMap {
  return ICON_BY_KIND[classifyCondition(condition)];
}
