import { useLocalSearchParams } from 'expo-router';

import { SeasonalAdvisoryScreen } from '../../../src/features/forecasts/seasonal-advisory/SeasonalAdvisoryScreen';
import { asSeasonKey, asWindowKey } from '../../../src/features/forecasts/seasonal-advisory/routeParams';

export default function SeasonalAdvisoryRoute() {
  const { region, season, window } = useLocalSearchParams<{ region: string; season?: string; window?: string }>();
  return <SeasonalAdvisoryScreen region={region} season={asSeasonKey(season)} window={asWindowKey(window)} />;
}
