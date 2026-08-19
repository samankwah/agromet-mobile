import type { FarmReminder } from '../domain/farmReminder';
import { mockDelay, ServiceError } from './mockDelay';

/**
 * Tier B — signatures only (future "Farm Tools" reminders milestone).
 * Backed by an in-memory array rather than AsyncStorage for now — no
 * screen creates reminders yet, so wiring real persistence would be
 * premature; when this becomes real, it's the natural first candidate for
 * a `shared/storage/cache.ts`-backed local store (list, not query-result).
 */
let reminders: FarmReminder[] = [];

export async function listReminders(): Promise<FarmReminder[]> {
  return mockDelay(reminders);
}

export async function createReminder(input: Omit<FarmReminder, 'id' | 'createdAt' | 'isDone'>): Promise<FarmReminder> {
  const reminder: FarmReminder = { ...input, id: `reminder-${Date.now()}`, createdAt: new Date().toISOString(), isDone: false };
  reminders = [...reminders, reminder];
  return mockDelay(reminder);
}

export async function updateReminder(id: string, patch: Partial<FarmReminder>): Promise<FarmReminder> {
  const existing = reminders.find((r) => r.id === id);
  if (!existing) throw new ServiceError(`No reminder found with id "${id}"`);
  const updated = { ...existing, ...patch };
  reminders = reminders.map((r) => (r.id === id ? updated : r));
  return mockDelay(updated);
}

export async function deleteReminder(id: string): Promise<void> {
  reminders = reminders.filter((r) => r.id !== id);
  return mockDelay(undefined);
}
