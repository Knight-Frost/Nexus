import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ThemeContext,
  type ThemeChoice,
  type ThemeContextValue,
  type ResolvedTheme,
  applyResolvedTheme,
  getStoredChoice,
  resolveChoice,
  storeChoice,
} from './theme';
import {
  applyDarkTheme,
  getStoredDarkTheme,
  storeDarkTheme,
} from '@/config/darkThemes';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [choice, setChoiceState] = useState<ThemeChoice>(() => getStoredChoice());
  const [resolved, setResolved] = useState<ResolvedTheme>(() => resolveChoice(getStoredChoice()));
  // Dark palette: persisted independently and applied as `data-dark-theme`. It
  // is set on <html> regardless of the current mode (harmless in light, since
  // the CSS blocks are gated on [data-theme='dark']) so it's ready the instant
  // dark mode activates.
  const [darkTheme, setDarkThemeState] = useState<string>(() => getStoredDarkTheme());
  const animTimer = useRef<number | undefined>(undefined);

  // Apply the resolved theme to <html> whenever it changes.
  useEffect(() => {
    applyResolvedTheme(resolved);
  }, [resolved]);

  // Apply the dark palette attribute whenever it changes (and on mount).
  useEffect(() => {
    applyDarkTheme(darkTheme);
  }, [darkTheme]);

  // While the choice is "system", track the OS preference live so the page
  // follows the OS when it flips (e.g. the nightly light→dark switch).
  useEffect(() => {
    if (choice !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setResolved(mq.matches ? 'dark' : 'light');
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [choice]);

  // Enable the CSS color crossfade only around an actual switch (see index.css:
  // `.theme-anim`), so normal interaction never pays the transition cost.
  const pulseAnim = useCallback(() => {
    const root = document.documentElement;
    root.classList.add('theme-anim');
    window.clearTimeout(animTimer.current);
    animTimer.current = window.setTimeout(() => root.classList.remove('theme-anim'), 320);
  }, []);

  const setChoice = useCallback(
    (next: ThemeChoice) => {
      pulseAnim();
      setChoiceState(next);
      storeChoice(next);
      setResolved(resolveChoice(next));
    },
    [pulseAnim],
  );

  // Flip to the opposite of what's showing, as an explicit (non-system) choice.
  const toggle = useCallback(() => {
    setChoice(resolved === 'dark' ? 'light' : 'dark');
  }, [resolved, setChoice]);

  const setDarkTheme = useCallback(
    (key: string) => {
      // Animate only when the change is actually visible (i.e. dark is active).
      if (resolved === 'dark') pulseAnim();
      setDarkThemeState(key);
      storeDarkTheme(key);
    },
    [resolved, pulseAnim],
  );

  const value = useMemo<ThemeContextValue>(
    () => ({ choice, resolved, setChoice, toggle, darkTheme, setDarkTheme }),
    [choice, resolved, setChoice, toggle, darkTheme, setDarkTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
