import { useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';

import { ForecastsScreen } from '../../src/features/forecasts/ForecastsScreen';

export default function ForecastsTab() {
  // `?segment=daily` from Home's forecast tile, `?segment=subseasonal` from its
  // outlook tile. Read here rather than inside the screen so the screen stays a
  // plain component its tests can render without a router.
  const { segment } = useLocalSearchParams<{ segment?: string }>();

  // Cleared once the screen has been given it, for two reasons. A tile tapped
  // twice would otherwise set the same value twice, which is no change at all
  // and so moves nothing the second time. And a param left behind outlives the
  // tap that set it, so a later press on the Forecasts tab would be dragged
  // back to that timescale instead of returning the reader where they were.
  useEffect(() => {
    if (segment) router.setParams({ segment: '' });
  }, [segment]);

  return <ForecastsScreen requestedSegment={segment} />;
}
