import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ACCENTS,
  DEFAULT_ACCENT_KEY,
  applyAccent,
  clearAccentOverrides,
  findAccent,
  getStoredAccentKey,
  storeAccentKey,
} from '@/config/accents';
import { AccentContext } from './accent';
import { getStoredChoice, resolveChoice } from './theme';

/**
 * AccentProvider — manages the user's chosen accent colour.
 *
 * Mirrors the ThemeProvider pattern:
 *  - Reads from localStorage (`nexus.accent`) on mount.
 *  - Applies CSS vars on <html> whenever the accent or resolved theme changes.
 *  - Provides `useAccent()` for descendants to read/set the accent.
 *
 * Placement: wrap INSIDE ThemeProvider (needs to re-apply on theme change)
 * but OUTSIDE page components. See main.tsx.
 */
export function AccentProvider({ children }: { children: React.ReactNode }) {
  const [accentKey, setAccentKeyState] = useState<string>(() => getStoredAccentKey());

  const accent = useMemo(() => findAccent(accentKey), [accentKey]);

  // Re-apply whenever accent key changes or on mount.
  // We also watch for theme changes by subscribing to the data-theme attribute
  // so dark-mode accent vars get applied if darkVars exist.
  useEffect(() => {
    function apply() {
      const themeChoice = getStoredChoice();
      const resolved = resolveChoice(themeChoice);
      if (accentKey === DEFAULT_ACCENT_KEY) {
        // Default accent — clear any inline overrides so the stylesheet values win.
        // Find all known accent var keys across ALL accents and remove them.
        for (const a of ACCENTS) {
          clearAccentOverrides(a);
        }
      } else {
        applyAccent(accent, resolved);
      }
    }

    apply();

    // Watch for theme flips (data-theme attribute changes on <html>).
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === 'attributes' && m.attributeName === 'data-theme') {
          apply();
        }
      }
    });
    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, [accent, accentKey]);

  const setAccentKey = useCallback((key: string) => {
    setAccentKeyState(key);
    storeAccentKey(key);
  }, []);

  const reset = useCallback(() => {
    setAccentKey(DEFAULT_ACCENT_KEY);
  }, [setAccentKey]);

  const value = useMemo(
    () => ({ accent, setAccentKey, reset }),
    [accent, setAccentKey, reset],
  );

  return <AccentContext.Provider value={value}>{children}</AccentContext.Provider>;
}
