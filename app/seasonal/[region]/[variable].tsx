import { useLocalSearchParams } from 'expo-router';

import { SeasonalConditionScreen } from '../../../src/features/forecasts/seasonal-advisory/SeasonalConditionScreen';
import { asSeasonKey, asVariable, asWindowKey } from '../../../src/features/forecasts/seasonal-advisory/routeParams';
import { EmptyState } from '../../../src/shared/ui/EmptyState';
import { Screen } from '../../../src/shared/ui/Screen';

export default function SeasonalConditionRoute() {
  const { region, variable, season, window } = useLocalSearchParams<{ region: string; variable: string; season?: string; window?: string }>();
  const known = asVariable(variable);
  if (!known) {
    return (
      <Screen>
        <EmptyState icon="help-circle-outline" title="Nothing to show" message="This link does not point to a seasonal figure." />
      </Screen>
    );
  }
  return <SeasonalConditionScreen region={region} variable={known} season={asSeasonKey(season)} window={asWindowKey(window)} />;
}
