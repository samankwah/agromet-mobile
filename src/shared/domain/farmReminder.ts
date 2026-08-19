/** Tier B this increment — type + placeholder mock only (future "Farm
 * Tools" reminders milestone). Local-first (see reminderService.ts), with
 * an optional link back to a calendar activity for reminders generated
 * from a crop/poultry calendar rather than created manually. */
export type FarmReminder = {
  id: string;
  title: string;
  note?: string;
  dueAt: string; // ISO 8601
  relatedCalendarActivityId?: string;
  crop?: string;
  isDone: boolean;
  createdAt: string;
};
