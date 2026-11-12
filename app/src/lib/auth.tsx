/** Remembers who is signed in. Screens call useAuth() to get the user, login(), register() and logout(). */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, ApiError, setToken, getToken } from './api';
import type { User } from './types';

interface AuthResponse {
  token: string;
  user: User;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  consent: boolean;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (input: RegisterInput) => Promise<User>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  setUser: (u: User | null) => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const token = await getToken();
    if (!token) {
      setUser(null);
      return;
    }
    try {
      const res = await api<{ user: User }>('/auth/me');
      setUser(res.user);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        await setToken(null);
        setUser(null);
      }
      // Network errors: keep the user signed in; screens show offline state.
    }
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api<AuthResponse>('/auth/login', { method: 'POST', body: { email, password }, auth: false });
    await setToken(res.token);
    setUser(res.user);
    return res.user;
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const res = await api<AuthResponse>('/auth/register', { method: 'POST', body: input, auth: false });
    await setToken(res.token);
    setUser(res.user);
    return res.user;
  }, []);

  const logout = useCallback(async () => {
    await setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, loading, login, register, logout, refresh, setUser }), [user, loading, login, register, logout, refresh]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
