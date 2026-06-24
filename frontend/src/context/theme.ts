import { createContext, useContext } from 'react';

/**
 * Theme model. The user's CHOICE is one of three; the APPLIED theme is always a
 * concrete light/dark. "system" resolves against the OS preference and keeps
 * tracking it live, so the page follows the OS when it flips (e.g. at dusk).
 *
 * The `data-theme` attribute on <html> is the single switch the CSS reads
 * (see index.css / landing.css). Server-side has no say here — this is purely a
 * client display preference, persisted in localStorage.
 */
export type ThemeChoice = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export interface ThemeContextValue {
  /** What the user picked (may be "system"). */
  choice: ThemeChoice;
  /** The concrete theme actually applied right now. */
  resolved: ResolvedTheme;
  /** Persist a new choice and apply it. */
  setChoice: (choice: ThemeChoice) => void;
  /** Flip between an explicit light and dark (leaves "system" behind). */
  toggle: () => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within <ThemeProvider>');
  return ctx;
}

/* --- Persistence + resolution helpers (kept here so the logic lives in one
   place; the pre-paint script in index.html mirrors the essential bits). --- */
export const THEME_KEY = 'nexus.theme';

export function getStoredChoice(): ThemeChoice {
  try {
    const v = localStorage.getItem(THEME_KEY);
    if (v === 'light' || v === 'dark' || v === 'system') return v;
  } catch {
    /* storage unavailable (private mode) */
  }
  return 'system';
}

export function storeChoice(choice: ThemeChoice): void {
  try {
    localStorage.setItem(THEME_KEY, choice);
  } catch {
    /* no-op */
  }
}

export function systemPrefersDark(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );
}

/** Collapse a choice (incl. "system") to the concrete theme to apply. */
export function resolveChoice(choice: ThemeChoice): ResolvedTheme {
  if (choice === 'system') return systemPrefersDark() ? 'dark' : 'light';
  return choice;
}

/** The page background per theme — also used for the browser UI `theme-color`. */
const THEME_COLOR: Record<ResolvedTheme, string> = {
  dark: '#071011',
  light: '#F7F9FC',
};

/** Apply a resolved theme to the document: the data-theme switch + chrome color. */
export function applyResolvedTheme(resolved: ResolvedTheme): void {
  const root = document.documentElement;
  root.setAttribute('data-theme', resolved);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', THEME_COLOR[resolved]);
}
