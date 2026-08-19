import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * The one generic, timestamped read/write-through cache used by every
 * feature that needs to persist something on-device — alerts' last
 * successful response, the saved-districts list, etc. Keeping exactly one
 * AsyncStorage access pattern in the app means there's one place to change
 * if the storage backend ever moves (e.g. to MMKV).
 */

const NAMESPACE = 'agromet:cache:';

export type CachedEntry<T> = {
  value: T;
  cachedAt: string; // ISO 8601
};

export async function setCached<T>(key: string, value: T): Promise<void> {
  const entry: CachedEntry<T> = { value, cachedAt: new Date().toISOString() };
  await AsyncStorage.setItem(NAMESPACE + key, JSON.stringify(entry));
}

export async function getCached<T>(key: string): Promise<CachedEntry<T> | null> {
  const raw = await AsyncStorage.getItem(NAMESPACE + key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CachedEntry<T>;
  } catch {
    // Corrupt/old-shape entry — treat as a cache miss rather than throwing.
    return null;
  }
}

export async function clearCached(key: string): Promise<void> {
  await AsyncStorage.removeItem(NAMESPACE + key);
}
