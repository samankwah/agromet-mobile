import { useLocalSearchParams } from 'expo-router';

import { AlertDetailsScreen } from '../../src/features/advisories/weather-alerts/screens/AlertDetailsScreen';

export default function AlertDetailsRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <AlertDetailsScreen alertId={id} />;
}
