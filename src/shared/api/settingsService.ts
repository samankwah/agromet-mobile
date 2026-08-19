import type { UserSettings } from '../domain/userSettings';

/**
 * Deliberately thin — settings are owned and persisted client-side by
 * `shared/state/settingsStore.ts`; there's no server sync to build against
 * yet. This no-op exists only to mark where a future account-sync
 * integration point goes, so the store's write path doesn't need to
 * change shape when that lands.
 */
export async function syncSettings(_settings: UserSettings): Promise<void> {
  // No-op — nothing to sync to yet.
}
