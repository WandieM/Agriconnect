/**
 * Offline copy of the Saved list (the brief asks for "saved list offline").
 * After every successful load we store the list on the phone; with no signal we show that copy.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export async function saveOfflineCopy<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), value }));
  } catch {
    // Storage full or unavailable: the app still works online.
  }
}

export async function loadOfflineCopy<T>(key: string): Promise<{ savedAt: number; value: T } | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
