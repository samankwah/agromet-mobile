import { useEffect, useState } from 'react';

import { isDaylight } from '../../../shared/utils/sun';

/** The middle of Ghana, for the national map's sunrise and sunset. */
export const GHANA_CENTRE = { lat: 7.95, lng: -1.03 };

export type MapLook = 'light' | 'dark';

/**
 * Light between sunrise and sunset at the given place, dark otherwise, checked
 * once a minute so an open map turns over at dusk without being reopened.
 */
export function useMapDaylight(place: { lat: number; lng: number } = GHANA_CENTRE): MapLook {
  const { lat, lng } = place;
  const [look, setLook] = useState<MapLook>(() => (isDaylight(new Date(), lat, lng) ? 'light' : 'dark'));

  useEffect(() => {
    const check = () => setLook(isDaylight(new Date(), lat, lng) ? 'light' : 'dark');
    check();
    const timer = setInterval(check, 60_000);
    return () => clearInterval(timer);
  }, [lat, lng]);

  return look;
}
