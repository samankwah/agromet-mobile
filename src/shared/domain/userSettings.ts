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

/** The weather warning types a farmer can be notified about. Same keys as the
 * hazard part of a warning's id (`weatherHazards.ts`) and the server's list. */
export type WarningHazard = 'thunderstorm' | 'heavy-rain' | 'extreme-heat' | 'strong-wind';

export const WARNING_HAZARDS: WarningHazard[] = ['thunderstorm', 'heavy-rain', 'extreme-heat', 'strong-wind'];

export type NotificationPrefs = {
  /**
   * Weather warnings as notifications, even with the app closed: the main
   * switch. Sent from the server when the phone is registered, scheduled on
   * the phone as a backup (`shared/notifications/weatherWarnings.ts`).
   */
  alertsEnabled: boolean;
  /** Which warning types notify, each on by default. */
  warningHazards: Record<WarningHazard, boolean>;
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
   * Keep a cassava diagnosis entirely on the phone: skip the call that asks
   * the backend's language model to explain the on-device result.
   *
   * The name predates the change that made the on-device model the first
   * choice for cassava, when this switch was what forced it. Kept so that
   * saved settings still load; the meaning narrowed to the one network call
   * that is left for it to control.
   */
  preferOfflineDiagnosis: boolean;
  notificationPrefs: NotificationPrefs;
};
