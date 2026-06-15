import { useCallback, useEffect, useMemo, useState } from 'react';
import { authApi } from '@/lib/endpoints';
import { setUnauthorizedHandler } from '@/lib/api';
import { clearToken, getToken, setToken } from '@/lib/storage';
import type { AuthUser, UserType } from '@/lib/types';
import { AuthContext, type AuthContextValue, toAuthUser } from './auth';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [initializing, setInitializing] = useState(true);

  const logout = useCallback(async () => {
    // Best-effort server revoke; the client session ends regardless.
    try {
      if (getToken()) await authApi.logout();
    } catch {
      /* ignore — token may already be invalid */
    }
    clearToken();
    setUser(null);
  }, []);

  // Expired/invalid token (any 401) → end the session cleanly.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearToken();
      setUser(null);
    });
  }, []);

  // Hydrate the session on first load if a token is present.
  useEffect(() => {
    let active = true;
    (async () => {
      if (!getToken()) {
        setInitializing(false);
        return;
      }
      try {
        const me = await authApi.me();
        if (active) setUser(toAuthUser(me));
      } catch {
        clearToken();
      } finally {
        if (active) setInitializing(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<AuthUser> => {
    const { user: u, token } = await authApi.login(email, password);
    setToken(token);
    const authUser = toAuthUser(u);
    setUser(authUser);
    return authUser;
  }, []);

  const register = useCallback(
    async (payload: {
      email: string;
      password: string;
      password_confirmation: string;
      first_name: string;
      last_name: string;
      phone?: string;
      user_type: UserType;
    }): Promise<AuthUser> => {
      const { user: u, token } = await authApi.register(payload);
      setToken(token);
      const authUser = toAuthUser(u);
      setUser(authUser);
      return authUser;
    },
    [],
  );

  const value = useMemo<AuthContextValue>(
    () => ({ user, initializing, login, register, logout }),
    [user, initializing, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
