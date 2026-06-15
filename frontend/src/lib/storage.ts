/**
 * Token storage. Kept in one place so the storage strategy is easy to change.
 *
 * Trade-off: localStorage persists across tabs/reloads (good UX) but is readable
 * by any JS on the page, so it relies on the app being XSS-free. The backend
 * uses bearer tokens by design (see bootstrap/app.php), and server-side
 * authorization is always the real gate — the token only identifies the caller.
 */
const TOKEN_KEY = 'nexus.token';

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* storage unavailable (private mode) — session stays in-memory only */
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* no-op */
  }
}
