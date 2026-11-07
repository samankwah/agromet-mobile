import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { UserSettings } from '../domain/userSettings';

/** The store's state shape is `UserSettings` plus its setters — the type
 * isn't redeclared here, it's imported, so there's exactly one definition
 * of what a "setting" is. Same persist+AsyncStorage pattern as
 * locationStore.ts, see that file's header comment for the cache.ts split
 * rationale. */
type SettingsState = UserSettings & {
  setThemeOverride: (value: UserSettings['themeOverride']) => void;
  setTextSize: (value: UserSettings['textSize']) => void;
  setDataSaverEnabled: (value: boolean) => void;
  setLanguage: (value: UserSettings['language']) => void;
  toggleFavouriteDistrict: (districtId: string) => void;
  toggleFavouriteCrop: (crop: string) => void;
  setLivestockType: (value: UserSettings['livestockType']) => void;
  setPreferOfflineDiagnosis: (value: boolean) => void;
  setNotificationPrefs: (value: Partial<UserSettings['notificationPrefs']>) => void;
};

const DEFAULT_SETTINGS: UserSettings = {
  themeOverride: 'system',
  textSize: 'standard',
  dataSaverEnabled: false,
  language: 'en',
  favouriteDistrictIds: [],
  favouriteCrops: [],
  livestockType: 'none',
  preferOfflineDiagnosis: false,
  notificationPrefs: {
    alertsEnabled: true,
    warningHazards: { thunderstorm: true, 'heavy-rain': true, 'extreme-heat': true, 'strong-wind': true },
    advisoriesEnabled: true,
    bulletinsEnabled: true,
    remindersEnabled: true,
  },
};

function toggleInArray(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_SETTINGS,
      setThemeOverride: (value) => set({ themeOverride: value }),
      setTextSize: (value) => set({ textSize: value }),
      setDataSaverEnabled: (value) => set({ dataSaverEnabled: value }),
      setLanguage: (value) => set({ language: value }),
      toggleFavouriteDistrict: (districtId) => set({ favouriteDistrictIds: toggleInArray(get().favouriteDistrictIds, districtId) }),
      toggleFavouriteCrop: (crop) => set({ favouriteCrops: toggleInArray(get().favouriteCrops, crop) }),
      setLivestockType: (value) => set({ livestockType: value }),
      setPreferOfflineDiagnosis: (value) => set({ preferOfflineDiagnosis: value }),
      setNotificationPrefs: (value) => set({ notificationPrefs: { ...get().notificationPrefs, ...value } }),
    }),
    {
      name: 'agromet:zustand:settings',
      storage: createJSONStorage(() => AsyncStorage),
      // Settings saved by an older version lack fields added since, such as
      // the warning types. The default merge is shallow and would replace the
      // whole `notificationPrefs` object with the old one, leaving the new
      // fields undefined, so the nested defaults are filled in here.
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<UserSettings>;
        const prefs = { ...current.notificationPrefs, ...(saved.notificationPrefs ?? {}) };
        prefs.warningHazards = { ...current.notificationPrefs.warningHazards, ...(saved.notificationPrefs?.warningHazards ?? {}) };
        return { ...current, ...saved, notificationPrefs: prefs };
      },
    },
  ),
);
