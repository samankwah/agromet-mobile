import { useLocalSearchParams } from 'expo-router';

import { DayDetailScreen } from '../../src/features/forecasts/day-detail/DayDetailScreen';

export default function ForecastDayRoute() {
  const { date } = useLocalSearchParams<{ date: string }>();
  return <DayDetailScreen date={date} />;
}
