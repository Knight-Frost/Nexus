import { useCallback, useEffect, useMemo, useState } from 'react';
import { authApi } from '@/lib/endpoints';
import { setPortalUnauthorizedHandler } from '@/lib/api';
import {
  type Portal,
  clearActivePortal,
  clearLegacyToken,
  clearPortalToken,
  getActivePortal,
  getPortalToken,
  portalTokenKey,
  setActivePortal,
  setPortalToken,
} from '@/lib/storage';
import type { AuthUser, UserType } from '@/lib/types';
import { AuthContext, type AuthContextValue, toAuthUser } from './auth';

function roleToPortal(role: AuthUser['role']): Portal {
  if (role === 'admin') return 'admin';
  if (role === 'landlord') return 'landlord';
  return 'tenant';
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [portal, setPortal] = useState<Portal | null>(null);
  const [initializing, setInitializing] = useState(true);

  // Wire a 401 on this portal's client to clear only this portal's session.
  function bindUnauthorizedHandler(p: Portal) {
    setPortalUnauthorizedHandler(p, () => {
      clearPortalToken(p);
      clearActivePortal();
      setUser(null);
      setPortal(null);
    });
  }

  // One-time migration: erase the old shared 'nexus.token' key so it can never
  // contaminate a portal session.
  useEffect(() => {
    clearLegacyToken();
  }, []);

  // Cross-tab logout / session expiry. When another tab logs out (or a 401
  // clears a token), it removes nexus.auth.{p}.token from localStorage, which
  // fires a `storage` event here. If the removed key is THIS tab's active
  // portal, end the session too — so a logout in one tab doesn't leave stale
  // authenticated UI in another. Other portals are untouched (key won't match).
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === null) return; // localStorage.clear()
      const p = getActivePortal();
      if (!p) return;
      if (e.key === portalTokenKey(p) && e.newValue === null) {
        clearActivePortal();
        setUser(null);
        setPortal(null);
      }
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Hydrate from the portal stored in sessionStorage for this tab.
  useEffect(() => {
    let active = true;
    (async () => {
      const p = getActivePortal();
      if (!p || !getPortalToken(p)) {
        setInitializing(false);
        return;
      }
      bindUnauthorizedHandler(p);
      try {
        const me = await authApi.me(p);
        if (active) {
          setUser(toAuthUser(me));
          setPortal(p);
        }
      } catch {
        // Token is invalid — clear this portal's session only.
        clearPortalToken(p);
        clearActivePortal();
      } finally {
        if (active) setInitializing(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(
    async (email: string, password: string, remember = true): Promise<AuthUser> => {
      const { user: u, token } = await authApi.login(email, password);
      const authUser = toAuthUser(u);
      const p = roleToPortal(authUser.role);
      setPortalToken(p, token, remember);
      setActivePortal(p); // binds THIS tab's session — other tabs are unaffected
      bindUnauthorizedHandler(p);
      setUser(authUser);
      setPortal(p);
      return authUser;
    },
    [],
  );

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
      const authUser = toAuthUser(u);
      const p = roleToPortal(authUser.role);
      setPortalToken(p, token);
      setActivePortal(p);
      bindUnauthorizedHandler(p);
      setUser(authUser);
      setPortal(p);
      return authUser;
    },
    [],
  );

  const logout = useCallback(async () => {
    // Use the live sessionStorage value in case React state lags.
    const p = getActivePortal() ?? portal;
    try {
      if (p && getPortalToken(p)) await authApi.logout(p);
    } catch {
      // Token may already be invalid — client session ends regardless.
    }
    if (p) clearPortalToken(p);
    clearActivePortal();
    setUser(null);
    setPortal(null);
  }, [portal]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, portal, initializing, login, register, logout }),
    [user, portal, initializing, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
