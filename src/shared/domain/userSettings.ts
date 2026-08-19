/**
 * The one definition of the app's persisted settings shape — imported by
 * both this domain layer and `shared/state/settingsStore.ts` (the store
 * doesn't redeclare the shape, it imports this type), so there's a single
 * source of truth for what a "setting" is.
 */
export type ThemeOverride = 'system' | 'light' | 'dark';
export type TextSize = 'standard' | 'large' | 'extra-large';
/** Only 'en' today — a literal union specifically so 'tw' | 'ee' | 'ga' |
 * 'dag' slot in later as an extension, not a reshape. */
export type Language = 'en';

export type NotificationPrefs = {
  alertsEnabled: boolean;
  advisoriesEnabled: boolean;
  bulletinsEnabled: boolean;
};

export type UserSettings = {
  themeOverride: ThemeOverride;
  textSize: TextSize;
  dataSaverEnabled: boolean;
  language: Language;
  favouriteDistrictIds: string[];
  favouriteCrops: string[];
  livestockType: 'poultry' | 'none';
  notificationPrefs: NotificationPrefs;
};
