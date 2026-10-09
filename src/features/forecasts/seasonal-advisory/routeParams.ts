import type { SeasonKey, SeasonalVariableId, WindowKey } from '../../../shared/domain/seasonalOutlook';
import { SEASONAL_VARIABLES, SEASON_KEYS, WINDOW_KEYS } from '../../../shared/domain/seasonalOutlook';

/** Route params arrive as any string. Only known values pass through. */
export function asSeasonKey(value: string | undefined): SeasonKey | undefined {
  return SEASON_KEYS.find((key) => key === value);
}

export function asWindowKey(value: string | undefined): WindowKey | undefined {
  return WINDOW_KEYS.find((key) => key === value);
}

export function asVariable(value: string | undefined): SeasonalVariableId | undefined {
  return SEASONAL_VARIABLES.find((key) => key === value);
}
