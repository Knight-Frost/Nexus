/**
 * Accent registry for the Wyncrest accent-color picker.
 *
 * An ACCENT controls interactive highlights only — primary buttons, links,
 * focus rings, active nav, toggles, selected states and accent badges. It maps
 * to the `--color-brand-*` (identity) and `--color-action-*` (buttons) ramps
 * plus their on-colors. It is INTENTIONALLY separate from:
 *   - the appearance mode (light/dark/system) — see context/theme.ts
 *   - the dark palette (surfaces/atmosphere)   — see config/darkThemes.ts
 *
 * Each accent defines a `vars` set (light theme) and a `darkVars` set (dark
 * theme — luminous, tuned for near-black surfaces). The dark fix lives here:
 * because every accent ships darkVars, switching accent while dark mode is
 * active updates the visible colour immediately and stays contrast-safe.
 *
 * Contrast contract (verified by scripts/check-accent-contrast.mjs):
 *   - on-brand / on-action are WHITE for every accent in both modes.
 *   - brand-600 (light) and action-600 (both modes) are deep enough that white
 *     text meets WCAG AA (≥4.5:1). Brightness lives in the 400/500 (rings) and
 *     700 (links) steps, which sit on tinted/dark backgrounds, not under text.
 *
 * DEFAULT = "Wyncrest Blue" (the brand identity). It is always APPLIED (not a
 * cleared no-op), so the app's default interactive colour is Wyncrest Blue in
 * both light and dark.
 */

export interface AccentDefinition {
  key: string;
  label: string;
  /** Short helper shown under the picker. */
  hint: string;
  /** The swatch fill (brand-600 light) shown in the picker. */
  fill: string;
  /** CSS custom properties applied on <html> in LIGHT theme. */
  vars: Record<string, string>;
  /** CSS custom properties applied on <html> in DARK theme. */
  darkVars: Record<string, string>;
}

export const ACCENTS: AccentDefinition[] = [
  {
    key: 'wyncrest-blue',
    label: 'Wyncrest Blue',
    hint: 'The Wyncrest identity: deep, trustworthy azure.',
    fill: '#1D4ED8',
    vars: {
      '--color-brand-50': '#ECF1FC', '--color-brand-100': '#D4E0F8', '--color-brand-200': '#AEC6F1',
      '--color-brand-300': '#7BA2E7', '--color-brand-400': '#4C7EDB', '--color-brand-500': '#2E63CD',
      '--color-brand-600': '#1D4ED8', '--color-brand-700': '#1A41A8', '--color-brand-800': '#163680',
      '--color-brand-900': '#122A5E', '--color-brand-950': '#0B1B3D',
      '--color-action-400': '#3B7BE6', '--color-action-500': '#2563EB', '--color-action-600': '#1D4ED8', '--color-action-700': '#1A41A8',
      '--color-on-brand': '#FFFFFF', '--color-on-action': '#FFFFFF',
    },
    darkVars: {
      '--color-brand-50': '#0E1C33', '--color-brand-100': '#122441', '--color-brand-200': '#183158',
      '--color-brand-300': '#23457D', '--color-brand-400': '#3F6FC9', '--color-brand-500': '#5E92EC',
      '--color-brand-600': '#2F66D6', '--color-brand-700': '#90B7F5', '--color-brand-800': '#B9D2F9',
      '--color-brand-900': '#D8E5FC', '--color-brand-950': '#EDF3FE',
      '--color-action-400': '#4D86E8', '--color-action-500': '#3570DC', '--color-action-600': '#2A5ECF', '--color-action-700': '#234EB0',
      '--color-on-brand': '#FFFFFF', '--color-on-action': '#FFFFFF',
    },
  },
  {
    key: 'electric-blue',
    label: 'Electric Blue',
    hint: 'Brighter, energetic blue for high-visibility UI.',
    fill: '#2563EB',
    vars: {
      '--color-brand-50': '#EBF2FE', '--color-brand-100': '#D2E2FD', '--color-brand-200': '#A9C8FB',
      '--color-brand-300': '#72A4F8', '--color-brand-400': '#4485F2', '--color-brand-500': '#2F6FEF',
      '--color-brand-600': '#2563EB', '--color-brand-700': '#1D4FC4', '--color-brand-800': '#1A4099',
      '--color-brand-900': '#163172', '--color-brand-950': '#0E1F4A',
      '--color-action-400': '#4485F2', '--color-action-500': '#2F6FEF', '--color-action-600': '#2056D6', '--color-action-700': '#1D4FC4',
      '--color-on-brand': '#FFFFFF', '--color-on-action': '#FFFFFF',
    },
    darkVars: {
      '--color-brand-50': '#0D1C38', '--color-brand-100': '#102348', '--color-brand-200': '#163166',
      '--color-brand-300': '#1F4690', '--color-brand-400': '#3B79EC', '--color-brand-500': '#62A0FF',
      '--color-brand-600': '#2A63E0', '--color-brand-700': '#93C5FD', '--color-brand-800': '#BFDBFE',
      '--color-brand-900': '#DBEAFE', '--color-brand-950': '#EFF6FF',
      '--color-action-400': '#5C97FF', '--color-action-500': '#3B82F6', '--color-action-600': '#2F6FEF', '--color-action-700': '#2056D6',
      '--color-on-brand': '#FFFFFF', '--color-on-action': '#FFFFFF',
    },
  },
  {
    key: 'ice-cyan',
    label: 'Ice Cyan',
    hint: 'Cool, crisp cyan with icy focus highlights.',
    fill: '#0E7490',
    vars: {
      '--color-brand-50': '#E7F6FB', '--color-brand-100': '#C5EAF4', '--color-brand-200': '#8FD6E9',
      '--color-brand-300': '#4FBBD7', '--color-brand-400': '#1E9DBE', '--color-brand-500': '#1186A6',
      '--color-brand-600': '#0E7490', '--color-brand-700': '#0C6079', '--color-brand-800': '#0A4D61',
      '--color-brand-900': '#073B4A', '--color-brand-950': '#04262F',
      '--color-action-400': '#1E9DBE', '--color-action-500': '#1186A6', '--color-action-600': '#0E7490', '--color-action-700': '#0C6079',
      '--color-on-brand': '#FFFFFF', '--color-on-action': '#FFFFFF',
    },
    darkVars: {
      '--color-brand-50': '#082530', '--color-brand-100': '#0A2E3B', '--color-brand-200': '#0E3E4F',
      '--color-brand-300': '#13586E', '--color-brand-400': '#1C8BA8', '--color-brand-500': '#34D8EC',
      '--color-brand-600': '#0E7C97', '--color-brand-700': '#5DE0F2', '--color-brand-800': '#9CEDF8',
      '--color-brand-900': '#C5F4FB', '--color-brand-950': '#E5FBFD',
      '--color-action-400': '#2BB6D4', '--color-action-500': '#1198BA', '--color-action-600': '#0E7E9C', '--color-action-700': '#0C6378',
      '--color-on-brand': '#FFFFFF', '--color-on-action': '#FFFFFF',
    },
  },
  {
    key: 'harbor-teal',
    label: 'Harbor Teal',
    hint: 'The classic Wyncrest ink-teal: calm and premium.',
    fill: '#0A7068',
    vars: {
      '--color-brand-50': '#E6F2F1', '--color-brand-100': '#C5E4E1', '--color-brand-200': '#98D0CB',
      '--color-brand-300': '#54B3AB', '--color-brand-400': '#1C988F', '--color-brand-500': '#0D8278',
      '--color-brand-600': '#0A7068', '--color-brand-700': '#096058', '--color-brand-800': '#08504C',
      '--color-brand-900': '#063E3A', '--color-brand-950': '#032828',
      '--color-action-400': '#1C988F', '--color-action-500': '#0D8278', '--color-action-600': '#0A7068', '--color-action-700': '#085048',
      '--color-on-brand': '#FFFFFF', '--color-on-action': '#FFFFFF',
    },
    darkVars: {
      '--color-brand-50': '#0E2A28', '--color-brand-100': '#123431', '--color-brand-200': '#17433F',
      '--color-brand-300': '#1E5852', '--color-brand-400': '#1C988F', '--color-brand-500': '#2DD4BF',
      '--color-brand-600': '#0D8175', '--color-brand-700': '#5EEAD4', '--color-brand-800': '#7FF0E2',
      '--color-brand-900': '#A7F3E9', '--color-brand-950': '#D5FBF4',
      '--color-action-400': '#19B3A4', '--color-action-500': '#119A8D', '--color-action-600': '#0E8175', '--color-action-700': '#0B655C',
      '--color-on-brand': '#FFFFFF', '--color-on-action': '#FFFFFF',
    },
  },
  {
    key: 'signal-indigo',
    label: 'Signal Indigo',
    hint: 'Confident indigo for a distinctive, modern feel.',
    fill: '#4338CA',
    vars: {
      '--color-brand-50': '#EEEDFB', '--color-brand-100': '#DAD8F6', '--color-brand-200': '#B6B2EE',
      '--color-brand-300': '#8B85E1', '--color-brand-400': '#6B63D6', '--color-brand-500': '#5249CF',
      '--color-brand-600': '#4338CA', '--color-brand-700': '#372EA6', '--color-brand-800': '#2C2583',
      '--color-brand-900': '#211C63', '--color-brand-950': '#151140',
      '--color-action-400': '#6B63D6', '--color-action-500': '#5249CF', '--color-action-600': '#4338CA', '--color-action-700': '#372EA6',
      '--color-on-brand': '#FFFFFF', '--color-on-action': '#FFFFFF',
    },
    darkVars: {
      '--color-brand-50': '#15123A', '--color-brand-100': '#1B1748', '--color-brand-200': '#252063',
      '--color-brand-300': '#332C8C', '--color-brand-400': '#5B52D6', '--color-brand-500': '#8B85F0',
      '--color-brand-600': '#4F46E5', '--color-brand-700': '#A5A0F8', '--color-brand-800': '#C7C3FB',
      '--color-brand-900': '#DEDBFD', '--color-brand-950': '#EFEEFE',
      '--color-action-400': '#6D64EC', '--color-action-500': '#5B52DE', '--color-action-600': '#4C43CE', '--color-action-700': '#3F37AC',
      '--color-on-brand': '#FFFFFF', '--color-on-action': '#FFFFFF',
    },
  },
  {
    key: 'estate-red',
    label: 'Estate Red',
    hint: 'Rationed oxblood: bold without overwhelming.',
    fill: '#B42318',
    vars: {
      '--color-brand-50': '#FBEAE8', '--color-brand-100': '#F6CCC8', '--color-brand-200': '#EDA098',
      '--color-brand-300': '#E07064', '--color-brand-400': '#D14C3E', '--color-brand-500': '#C13325',
      '--color-brand-600': '#B42318', '--color-brand-700': '#971C13', '--color-brand-800': '#79160F',
      '--color-brand-900': '#5C110B', '--color-brand-950': '#3B0A07',
      '--color-action-400': '#D14C3E', '--color-action-500': '#C13325', '--color-action-600': '#B42318', '--color-action-700': '#971C13',
      '--color-on-brand': '#FFFFFF', '--color-on-action': '#FFFFFF',
    },
    darkVars: {
      '--color-brand-50': '#33100C', '--color-brand-100': '#411511', '--color-brand-200': '#5C1B14',
      '--color-brand-300': '#83271C', '--color-brand-400': '#D14C3E', '--color-brand-500': '#F08070',
      '--color-brand-600': '#C9382B', '--color-brand-700': '#F4A79C', '--color-brand-800': '#F8C5BE',
      '--color-brand-900': '#FBDCD7', '--color-brand-950': '#FDEEEB',
      '--color-action-400': '#DC5849', '--color-action-500': '#CB4133', '--color-action-600': '#B92F22', '--color-action-700': '#97251A',
      '--color-on-brand': '#FFFFFF', '--color-on-action': '#FFFFFF',
    },
  },
  {
    key: 'slate-blue',
    label: 'Slate Blue',
    hint: 'Muted, professional slate-blue for understated UI.',
    fill: '#3B5BA5',
    vars: {
      '--color-brand-50': '#ECEFF7', '--color-brand-100': '#D5DCED', '--color-brand-200': '#AEBCDB',
      '--color-brand-300': '#8095C5', '--color-brand-400': '#5A73B0', '--color-brand-500': '#46609F',
      '--color-brand-600': '#3B5BA5', '--color-brand-700': '#324C87', '--color-brand-800': '#293D6B',
      '--color-brand-900': '#1F2F50', '--color-brand-950': '#141E34',
      '--color-action-400': '#5A73B0', '--color-action-500': '#46609F', '--color-action-600': '#39538F', '--color-action-700': '#324C87',
      '--color-on-brand': '#FFFFFF', '--color-on-action': '#FFFFFF',
    },
    darkVars: {
      '--color-brand-50': '#131B30', '--color-brand-100': '#18223C', '--color-brand-200': '#202E52',
      '--color-brand-300': '#2D4173', '--color-brand-400': '#4C68B0', '--color-brand-500': '#7C9BD8',
      '--color-brand-600': '#4163AE', '--color-brand-700': '#9DB5E2', '--color-brand-800': '#C2D1ED',
      '--color-brand-900': '#DBE3F4', '--color-brand-950': '#EEF2FA',
      '--color-action-400': '#5778C0', '--color-action-500': '#4663A8', '--color-action-600': '#3B5494', '--color-action-700': '#314676',
      '--color-on-brand': '#FFFFFF', '--color-on-action': '#FFFFFF',
    },
  },
];

export const DEFAULT_ACCENT_KEY = 'wyncrest-blue';
export const ACCENT_STORAGE_KEY = 'nexus.accent'; // internal key retained (see CLAUDE.md)

/** Look up an accent by key; falls back to the default. */
export function findAccent(key: string): AccentDefinition {
  return ACCENTS.find((a) => a.key === key) ?? ACCENTS[0];
}

/** Read the persisted accent key from localStorage. */
export function getStoredAccentKey(): string {
  try {
    return localStorage.getItem(ACCENT_STORAGE_KEY) ?? DEFAULT_ACCENT_KEY;
  } catch {
    return DEFAULT_ACCENT_KEY;
  }
}

/** Persist an accent key. */
export function storeAccentKey(key: string): void {
  try {
    localStorage.setItem(ACCENT_STORAGE_KEY, key);
  } catch {
    /* storage unavailable */
  }
}

/**
 * Apply an accent's CSS vars to <html> for the given resolved theme.
 * Dark uses `darkVars` (luminous); light uses `vars`.
 */
export function applyAccent(accent: AccentDefinition, resolved: 'light' | 'dark'): void {
  const root = document.documentElement;
  const vars = resolved === 'dark' ? accent.darkVars : accent.vars;
  for (const [prop, value] of Object.entries(vars)) {
    root.style.setProperty(prop, value);
  }
}
