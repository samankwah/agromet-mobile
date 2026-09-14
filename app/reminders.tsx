import { useLocalSearchParams } from 'expo-router';

import { RemindersScreen } from '../src/features/farm-tools/reminders/RemindersScreen';

export default function RemindersRoute() {
  // Set when the farmer opened the app by tapping a reminder notification.
  const { focus } = useLocalSearchParams<{ focus?: string }>();
  return <RemindersScreen focusId={focus} />;
}
