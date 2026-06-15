/**
 * Token storage. Kept in one place so the strategy is easy to change.
 *
 * "Remember me" controls persistence: when remembered, the token lives in
 * localStorage (survives browser restarts); otherwise it lives in sessionStorage
 * (cleared when the tab/browser closes). Server-side authorization is always the
 * real gate — the token only identifies the caller.
 */
const TOKEN_KEY = 'nexus.token';

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string, remember = true): void {
  try {
    if (remember) {
      localStorage.setItem(TOKEN_KEY, token);
      sessionStorage.removeItem(TOKEN_KEY);
    } else {
      sessionStorage.setItem(TOKEN_KEY, token);
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    /* storage unavailable (private mode) — session stays in-memory only */
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* no-op */
  }
}
