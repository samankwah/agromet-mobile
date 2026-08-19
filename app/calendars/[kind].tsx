import { useLocalSearchParams } from 'expo-router';

import { CalendarListScreen } from '../../src/features/farm-tools/calendars/CalendarListScreen';
import type { CalendarKind } from '../../src/shared/domain/calendar';

export default function CalendarsRoute() {
  const { kind } = useLocalSearchParams<{ kind: string }>();
  return <CalendarListScreen kind={kind === 'poultry' ? 'poultry' : ('crop' as CalendarKind)} />;
}
