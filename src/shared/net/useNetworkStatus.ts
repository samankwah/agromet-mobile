import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

/**
 * The one connectivity hook in the app. Backs the app-wide OfflineBanner,
 * and is imported directly (not via the banner) by anything that needs to
 * make an offline-vs-online *decision* — the diagnosis queue's auto-retry
 * trigger, and the alerts cache fallback.
 */
export function useNetworkStatus(): { isOnline: boolean; isChecking: boolean } {
  const [isOnline, setIsOnline] = useState(true);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      // isInternetReachable can be null while NetInfo is still determining
      // reachability — treat "connected, reachability unknown" as online
      // rather than flashing an offline banner on every screen mount.
      setIsOnline(state.isConnected !== false && state.isInternetReachable !== false);
      setIsChecking(false);
    });

    return unsubscribe;
  }, []);

  return { isOnline, isChecking };
}
