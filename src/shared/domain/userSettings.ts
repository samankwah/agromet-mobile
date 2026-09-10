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
  /**
   * The only one of these that is wired to anything today: it gates whether
   * farm reminders schedule an OS notification. Turning it off cancels every
   * scheduled reminder; turning it on reschedules them.
   */
  remindersEnabled: boolean;
};

export type UserSettings = {
  themeOverride: ThemeOverride;
  textSize: TextSize;
  dataSaverEnabled: boolean;
  language: Language;
  favouriteDistrictIds: string[];
  favouriteCrops: string[];
  livestockType: 'poultry' | 'none';
  /**
   * Force crop diagnosis through the on-device cassava model even when there
   * is a working connection.
   *
   * Off by default, because the online provider covers more crops and returns
   * better advice, so routing around it is a downgrade for an ordinary farmer.
   * It is exposed anyway for two reasons: a farmer on a metered connection may
   * genuinely prefer the answer that costs no data, and running both engines
   * over the same photographs is how the two get compared at all.
   */
  preferOfflineDiagnosis: boolean;
  notificationPrefs: NotificationPrefs;
};
