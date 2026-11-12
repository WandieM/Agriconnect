import AsyncStorage from '@react-native-async-storage/async-storage';

/** Tiny offline cache: last good response per key, so screens still show something with no signal. */
export async function saveCache<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(`cache:${key}`, JSON.stringify({ at: Date.now(), value }));
  } catch {
    // ignore storage errors
  }
}

export async function readCache<T>(key: string): Promise<{ at: number; value: T } | null> {
  try {
    const raw = await AsyncStorage.getItem(`cache:${key}`);
    return raw ? (JSON.parse(raw) as { at: number; value: T }) : null;
  } catch {
    return null;
  }
}
