import { useLocalSearchParams } from 'expo-router';

import { CalendarDetailScreen } from '../../src/features/farm-tools/calendars/CalendarDetailScreen';

export default function CalendarDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <CalendarDetailScreen id={id} />;
}
