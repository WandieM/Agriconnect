/** Talks to the backend. api('/path') adds the saved token and turns server errors into readable messages. */
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * API base URL. Set EXPO_PUBLIC_API_URL in .env (local) or in eas.json (builds).
 * Falls back to app.json -> expo.extra.apiUrl.
 */
export const API_URL: string = (
  process.env.EXPO_PUBLIC_API_URL ??
  (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl ??
  'http://localhost:4000'
).replace(/\/$/, '');

const TOKEN_KEY = 'agriopp_token';

// SecureStore is not available on web; the web preview (dev/demo only) uses localStorage.
const webStore = () => (globalThis as { localStorage?: Storage }).localStorage;

export async function getToken(): Promise<string | null> {
  if (Platform.OS === 'web') return webStore()?.getItem(TOKEN_KEY) ?? null;
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string | null): Promise<void> {
  if (Platform.OS === 'web') {
    if (token) webStore()?.setItem(TOKEN_KEY, token);
    else webStore()?.removeItem(TOKEN_KEY);
    return;
  }
  if (token) await SecureStore.setItemAsync(TOKEN_KEY, token);
  else await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: Record<string, string[] | undefined>,
  ) {
    super(message);
  }

  /** First field error, or the main message - good for showing to users. */
  get friendly(): string {
    const first = this.details && Object.values(this.details).find((v) => v && v.length);
    return first ? first[0] : this.message;
  }
}

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

export async function api<T>(path: string, options: { method?: Method; body?: unknown; auth?: boolean } = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (options.auth !== false) {
    const token = await getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const controller = new AbortController();
  // Render free instances can take ~50s to wake up.
  const timeout = setTimeout(() => controller.abort(), 60000);
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/v1${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
  } catch {
    throw new ApiError(0, 'NETWORK', 'No connection to the server. Check your data or Wi-Fi and try again.');
  } finally {
    clearTimeout(timeout);
  }

  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = (data as { error?: { code?: string; message?: string; details?: Record<string, string[]> } }).error;
    throw new ApiError(res.status, err?.code ?? 'ERROR', err?.message ?? `Request failed (${res.status})`, err?.details);
  }
  return data as T;
}

export function imageUri(path: string | null | undefined): string | null {
  if (!path) return null;
  return path.startsWith('http') ? path : `${API_URL}${path}`;
}

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.friendly;
  if (err instanceof Error) return err.message;
  return 'Something went wrong';
}
