import { createContext, useContext } from 'react';
import type { AccentDefinition } from '@/config/accents';

export interface AccentContextValue {
  /** The currently active accent. */
  accent: AccentDefinition;
  /** Set a new accent by key and persist it. */
  setAccentKey: (key: string) => void;
  /** Reset to the default accent (Ink Teal). */
  reset: () => void;
}

export const AccentContext = createContext<AccentContextValue | null>(null);

export function useAccent(): AccentContextValue {
  const ctx = useContext(AccentContext);
  if (!ctx) throw new Error('useAccent must be used within <AccentProvider>');
  return ctx;
}
