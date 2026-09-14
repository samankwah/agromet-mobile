import { useLocalSearchParams } from 'expo-router';

import { RegionHazardScreen } from '../../src/features/advisories/flood-drought/RegionHazardScreen';

export default function RegionHazardRoute() {
  const { region, hazard } = useLocalSearchParams<{ region: string; hazard?: string }>();
  return <RegionHazardScreen region={region} initialHazard={hazard === 'drought' ? 'drought' : 'flood'} />;
}
