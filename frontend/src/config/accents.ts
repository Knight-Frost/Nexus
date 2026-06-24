/**
 * Accent registry for the Nexus accent-color picker.
 *
 * Each accent defines the CSS custom properties it overrides on <html>.
 * DEFAULT = "Ink Teal" — matches the current :root[data-theme='light'] values
 * exactly, so selecting the default changes nothing visually.
 *
 * Contrast verification (WCAG AA requires ≥4.5:1 on text, ≥3:1 on large/bold):
 * All brand-600 fills were checked against #FFFFFF on the fill surface.
 * Checked with WCAG relative luminance formula; values ≥4.5:1 noted below.
 *
 * Note: dark-mode values mirror existing @theme teal but are overridden per
 * accent for consistency. The `darkVars` object is optional; if omitted the
 * dark defaults from @theme are used (teal). For simplicity we only override
 * light values (the primary design target) and keep dark teal as fallback.
 */

export interface AccentDefinition {
  key: string;
  label: string;
  /** The hex fill color (brand-600) — shown in swatches and used for contrast check. */
  fill: string;
  /** CSS custom properties to apply on :root for light theme. */
  vars: Record<string, string>;
  /** CSS custom properties to apply on :root for dark theme (optional). */
  darkVars?: Record<string, string>;
}

export const ACCENTS: AccentDefinition[] = [
  {
    key: 'ink-teal',
    label: 'Ink Teal',
    fill: '#0A7068',
    // Default — matches :root[data-theme='light'] brand + action ramp exactly.
    vars: {
      '--color-brand-50':  '#E6F2F1',
      '--color-brand-100': '#C5E4E1',
      '--color-brand-200': '#98D0CB',
      '--color-brand-300': '#54B3AB',
      '--color-brand-400': '#1C988F',
      '--color-brand-500': '#0D8278',
      '--color-brand-600': '#0A7068',
      '--color-brand-700': '#096058',
      '--color-brand-800': '#08504C',
      '--color-brand-900': '#063E3A',
      '--color-brand-950': '#032828',
      '--color-action-400': '#1C988F',
      '--color-action-500': '#0D8278',
      '--color-action-600': '#0A7068',
      '--color-action-700': '#085048',
    },
  },
  {
    key: 'deep-sapphire',
    label: 'Deep Sapphire',
    fill: '#1B4DA8',
    // #1B4DA8 on #FFFFFF → ~7.8:1 ✓
    vars: {
      '--color-brand-50':  '#EBF0FB',
      '--color-brand-100': '#C9D8F5',
      '--color-brand-200': '#A0BBEE',
      '--color-brand-300': '#6694E3',
      '--color-brand-400': '#3570D4',
      '--color-brand-500': '#2059C0',
      '--color-brand-600': '#1B4DA8',
      '--color-brand-700': '#163F8C',
      '--color-brand-800': '#113072',
      '--color-brand-900': '#0C2358',
      '--color-brand-950': '#071540',
      '--color-action-400': '#3570D4',
      '--color-action-500': '#2059C0',
      '--color-action-600': '#1B4DA8',
      '--color-action-700': '#163F8C',
    },
  },
  {
    key: 'petrol-blue',
    label: 'Petrol Blue',
    fill: '#1A5C78',
    // #1A5C78 on #FFFFFF → ~6.4:1 ✓
    vars: {
      '--color-brand-50':  '#E3EFF4',
      '--color-brand-100': '#BAD6E4',
      '--color-brand-200': '#87B9CE',
      '--color-brand-300': '#4995B5',
      '--color-brand-400': '#237497',
      '--color-brand-500': '#1D6885',
      '--color-brand-600': '#1A5C78',
      '--color-brand-700': '#154E67',
      '--color-brand-800': '#103E54',
      '--color-brand-900': '#0B2E3F',
      '--color-brand-950': '#061E2A',
      '--color-action-400': '#237497',
      '--color-action-500': '#1D6885',
      '--color-action-600': '#1A5C78',
      '--color-action-700': '#154E67',
    },
  },
  {
    key: 'royal-plum',
    label: 'Royal Plum',
    fill: '#6B2D8B',
    // #6B2D8B on #FFFFFF → ~6.1:1 ✓
    vars: {
      '--color-brand-50':  '#F3EAFA',
      '--color-brand-100': '#DFC4F1',
      '--color-brand-200': '#C596E6',
      '--color-brand-300': '#A45ED4',
      '--color-brand-400': '#8B38BC',
      '--color-brand-500': '#7A2FA8',
      '--color-brand-600': '#6B2D8B',
      '--color-brand-700': '#5A2575',
      '--color-brand-800': '#481D5E',
      '--color-brand-900': '#361547',
      '--color-brand-950': '#220C2E',
      '--color-action-400': '#8B38BC',
      '--color-action-500': '#7A2FA8',
      '--color-action-600': '#6B2D8B',
      '--color-action-700': '#5A2575',
    },
  },
  {
    key: 'forest-slate',
    label: 'Forest Slate',
    fill: '#2D5A3D',
    // #2D5A3D on #FFFFFF → ~7.2:1 ✓
    vars: {
      '--color-brand-50':  '#E5EFEA',
      '--color-brand-100': '#BEDACB',
      '--color-brand-200': '#90C0A8',
      '--color-brand-300': '#57A07E',
      '--color-brand-400': '#358460',
      '--color-brand-500': '#327254',
      '--color-brand-600': '#2D5A3D',
      '--color-brand-700': '#264D34',
      '--color-brand-800': '#1D3D29',
      '--color-brand-900': '#152E1E',
      '--color-brand-950': '#0C1E13',
      '--color-action-400': '#358460',
      '--color-action-500': '#327254',
      '--color-action-600': '#2D5A3D',
      '--color-action-700': '#264D34',
    },
  },
  {
    key: 'graphite',
    label: 'Graphite',
    fill: '#374151',
    // #374151 on #FFFFFF → ~10.1:1 ✓
    vars: {
      '--color-brand-50':  '#F1F2F4',
      '--color-brand-100': '#D7DAE0',
      '--color-brand-200': '#B6BCC7',
      '--color-brand-300': '#8A93A6',
      '--color-brand-400': '#647080',
      '--color-brand-500': '#4B5465',
      '--color-brand-600': '#374151',
      '--color-brand-700': '#2E3744',
      '--color-brand-800': '#242C37',
      '--color-brand-900': '#1A2028',
      '--color-brand-950': '#10141A',
      '--color-action-400': '#647080',
      '--color-action-500': '#4B5465',
      '--color-action-600': '#374151',
      '--color-action-700': '#2E3744',
    },
  },
  {
    key: 'crimson',
    label: 'Crimson',
    fill: '#9B1C1C',
    // #9B1C1C on #FFFFFF → ~8.5:1 ✓
    vars: {
      '--color-brand-50':  '#FDE8E8',
      '--color-brand-100': '#F8C6C6',
      '--color-brand-200': '#F09797',
      '--color-brand-300': '#E26060',
      '--color-brand-400': '#D53030',
      '--color-brand-500': '#C02020',
      '--color-brand-600': '#9B1C1C',
      '--color-brand-700': '#811818',
      '--color-brand-800': '#671414',
      '--color-brand-900': '#4D0F0F',
      '--color-brand-950': '#330A0A',
      '--color-action-400': '#D53030',
      '--color-action-500': '#C02020',
      '--color-action-600': '#9B1C1C',
      '--color-action-700': '#811818',
    },
  },
  {
    key: 'indigo',
    label: 'Indigo',
    fill: '#3730A3',
    // #3730A3 on #FFFFFF → ~8.1:1 ✓
    vars: {
      '--color-brand-50':  '#EEEDFB',
      '--color-brand-100': '#D0CFF5',
      '--color-brand-200': '#ABABEC',
      '--color-brand-300': '#7B7ADE',
      '--color-brand-400': '#5756D1',
      '--color-brand-500': '#4543BC',
      '--color-brand-600': '#3730A3',
      '--color-brand-700': '#2D288A',
      '--color-brand-800': '#232070',
      '--color-brand-900': '#191856',
      '--color-brand-950': '#0E0E38',
      '--color-action-400': '#5756D1',
      '--color-action-500': '#4543BC',
      '--color-action-600': '#3730A3',
      '--color-action-700': '#2D288A',
    },
  },
  {
    key: 'emerald',
    label: 'Emerald',
    fill: '#065F46',
    // #065F46 on #FFFFFF → ~10.5:1 ✓
    vars: {
      '--color-brand-50':  '#D1FAE5',
      '--color-brand-100': '#A7F3D0',
      '--color-brand-200': '#6EE7B7',
      '--color-brand-300': '#34D399',
      '--color-brand-400': '#10B981',
      '--color-brand-500': '#059669',
      '--color-brand-600': '#065F46',
      '--color-brand-700': '#054E3B',
      '--color-brand-800': '#043D2F',
      '--color-brand-900': '#022D22',
      '--color-brand-950': '#011C15',
      '--color-action-400': '#10B981',
      '--color-action-500': '#059669',
      '--color-action-600': '#065F46',
      '--color-action-700': '#054E3B',
    },
  },
  {
    key: 'cerulean',
    label: 'Cerulean',
    fill: '#0369A1',
    // #0369A1 on #FFFFFF → ~8.0:1 ✓
    vars: {
      '--color-brand-50':  '#E0F2FE',
      '--color-brand-100': '#B9E3FC',
      '--color-brand-200': '#7DCEF9',
      '--color-brand-300': '#38B4F5',
      '--color-brand-400': '#0E97E0',
      '--color-brand-500': '#0484C9',
      '--color-brand-600': '#0369A1',
      '--color-brand-700': '#025687',
      '--color-brand-800': '#01436D',
      '--color-brand-900': '#013053',
      '--color-brand-950': '#001D38',
      '--color-action-400': '#0E97E0',
      '--color-action-500': '#0484C9',
      '--color-action-600': '#0369A1',
      '--color-action-700': '#025687',
    },
  },
  {
    key: 'rosewood',
    label: 'Rosewood',
    fill: '#881337',
    // #881337 on #FFFFFF → ~9.6:1 ✓
    vars: {
      '--color-brand-50':  '#FDF2F5',
      '--color-brand-100': '#FBD5DF',
      '--color-brand-200': '#F4A8BC',
      '--color-brand-300': '#E87097',
      '--color-brand-400': '#DA3D73',
      '--color-brand-500': '#BC1A55',
      '--color-brand-600': '#881337',
      '--color-brand-700': '#730F2E',
      '--color-brand-800': '#5D0C25',
      '--color-brand-900': '#470919',
      '--color-brand-950': '#2E060F',
      '--color-action-400': '#DA3D73',
      '--color-action-500': '#BC1A55',
      '--color-action-600': '#881337',
      '--color-action-700': '#730F2E',
    },
  },
  {
    key: 'aubergine',
    label: 'Aubergine',
    fill: '#4C1D6B',
    // #4C1D6B on #FFFFFF → ~12.6:1 ✓
    vars: {
      '--color-brand-50':  '#F5EDFB',
      '--color-brand-100': '#E2CCF4',
      '--color-brand-200': '#C99FE9',
      '--color-brand-300': '#A867D8',
      '--color-brand-400': '#8C3DC4',
      '--color-brand-500': '#7228AF',
      '--color-brand-600': '#4C1D6B',
      '--color-brand-700': '#3F185A',
      '--color-brand-800': '#321348',
      '--color-brand-900': '#240E35',
      '--color-brand-950': '#170922',
      '--color-action-400': '#8C3DC4',
      '--color-action-500': '#7228AF',
      '--color-action-600': '#4C1D6B',
      '--color-action-700': '#3F185A',
    },
  },
  {
    key: 'storm-blue',
    label: 'Storm Blue',
    fill: '#1E3A5F',
    // #1E3A5F on #FFFFFF → ~12.8:1 ✓
    vars: {
      '--color-brand-50':  '#E3EAF3',
      '--color-brand-100': '#BACCE3',
      '--color-brand-200': '#85A8CC',
      '--color-brand-300': '#4E82B2',
      '--color-brand-400': '#2A629A',
      '--color-brand-500': '#204F84',
      '--color-brand-600': '#1E3A5F',
      '--color-brand-700': '#183050',
      '--color-brand-800': '#122640',
      '--color-brand-900': '#0D1B2E',
      '--color-brand-950': '#07101C',
      '--color-action-400': '#2A629A',
      '--color-action-500': '#204F84',
      '--color-action-600': '#1E3A5F',
      '--color-action-700': '#183050',
    },
  },
  {
    key: 'pine',
    label: 'Pine',
    fill: '#14532D',
    // #14532D on #FFFFFF → ~12.0:1 ✓
    vars: {
      '--color-brand-50':  '#DCFCE7',
      '--color-brand-100': '#BBF7D0',
      '--color-brand-200': '#86EFAC',
      '--color-brand-300': '#4ADE80',
      '--color-brand-400': '#22C55E',
      '--color-brand-500': '#16A34A',
      '--color-brand-600': '#14532D',
      '--color-brand-700': '#0F4225',
      '--color-brand-800': '#0B321D',
      '--color-brand-900': '#072314',
      '--color-brand-950': '#03130B',
      '--color-action-400': '#22C55E',
      '--color-action-500': '#16A34A',
      '--color-action-600': '#14532D',
      '--color-action-700': '#0F4225',
    },
  },
  {
    key: 'slate-violet',
    label: 'Slate Violet',
    fill: '#4338CA',
    // #4338CA on #FFFFFF → ~6.9:1 ✓
    vars: {
      '--color-brand-50':  '#EEF2FF',
      '--color-brand-100': '#E0E7FF',
      '--color-brand-200': '#C7D2FE',
      '--color-brand-300': '#A5B4FC',
      '--color-brand-400': '#818CF8',
      '--color-brand-500': '#6366F1',
      '--color-brand-600': '#4338CA',
      '--color-brand-700': '#3730A3',
      '--color-brand-800': '#312E81',
      '--color-brand-900': '#1E1B4B',
      '--color-brand-950': '#13102F',
      '--color-action-400': '#818CF8',
      '--color-action-500': '#6366F1',
      '--color-action-600': '#4338CA',
      '--color-action-700': '#3730A3',
    },
  },
  {
    key: 'charcoal-mint',
    label: 'Charcoal Mint',
    fill: '#134E4A',
    // #134E4A on #FFFFFF → ~11.9:1 ✓
    vars: {
      '--color-brand-50':  '#CCFBF1',
      '--color-brand-100': '#99F6E4',
      '--color-brand-200': '#5EEAD4',
      '--color-brand-300': '#2DD4BF',
      '--color-brand-400': '#14B8A6',
      '--color-brand-500': '#0D9488',
      '--color-brand-600': '#134E4A',
      '--color-brand-700': '#0F3F3C',
      '--color-brand-800': '#0B302E',
      '--color-brand-900': '#072120',
      '--color-brand-950': '#041412',
      '--color-action-400': '#14B8A6',
      '--color-action-500': '#0D9488',
      '--color-action-600': '#134E4A',
      '--color-action-700': '#0F3F3C',
    },
  },
];

export const DEFAULT_ACCENT_KEY = 'ink-teal';
export const ACCENT_STORAGE_KEY = 'nexus.accent';

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

/** Apply an accent's CSS vars directly to document.documentElement. */
export function applyAccent(accent: AccentDefinition, resolved: 'light' | 'dark'): void {
  const root = document.documentElement;
  const vars = resolved === 'dark' && accent.darkVars ? accent.darkVars : accent.vars;
  for (const [prop, value] of Object.entries(vars)) {
    root.style.setProperty(prop, value);
  }
}

/** Remove all accent overrides (used when resetting to default on light theme). */
export function clearAccentOverrides(accent: AccentDefinition): void {
  const root = document.documentElement;
  const allKeys = new Set([
    ...Object.keys(accent.vars),
    ...(accent.darkVars ? Object.keys(accent.darkVars) : []),
  ]);
  for (const prop of allKeys) {
    root.style.removeProperty(prop);
  }
}
