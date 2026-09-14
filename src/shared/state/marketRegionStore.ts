import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * Which market centre prices are shown against.
 *
 * A selection, not a cache — the same job locationStore does for the selected
 * town, so it uses the same persist + AsyncStorage pattern. It is kept out of
 * the screens because the list and the commodity detail both price against
 * it, and re-picking a region after every tap would make regional pricing more
 * trouble than it is worth.
 *
 * An empty string means the national average, which is the default.
 */
type MarketRegionState = {
  region: string;
  setRegion: (region: string) => void;
};

export const useMarketRegionStore = create<MarketRegionState>()(
  persist(
    (set) => ({
      region: '',
      setRegion: (region) => set({ region }),
    }),
    {
      name: 'agromet:zustand:market-region',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
