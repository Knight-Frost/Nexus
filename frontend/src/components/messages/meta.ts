/**
 * Presentational helpers for the Messages hub.
 * No JSX here (keeps Fast Refresh happy) — see atoms.tsx for the components
 * that consume these maps.
 * All mock/service imports have been removed; this file is pure utilities.
 */

/* ---- relative time ------------------------------------------------------- */

const HHMM = new Intl.DateTimeFormat('en-GH', { hour: 'numeric', minute: '2-digit' });
const DAY_MON = new Intl.DateTimeFormat('en-GH', { day: 'numeric', month: 'short' });
const MON_YR = new Intl.DateTimeFormat('en-GH', { month: 'short', year: 'numeric' });
const WEEKDAY = new Intl.DateTimeFormat('en-GH', { weekday: 'short' });
const FULL_DATE = new Intl.DateTimeFormat('en-GH', { day: 'numeric', month: 'short', year: 'numeric' });

/** Compact, clock-safe relative label for conversation/message timestamps. */
export function relTime(iso: string): string {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return '';
  const now = new Date();
  const diff = now.getTime() - then.getTime();
  if (diff < 60_000) return 'Just now';
  if (then.toDateString() === now.toDateString()) return HHMM.format(then);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (then.toDateString() === yesterday.toDateString()) return 'Yesterday';
  if (diff > 0 && diff < 7 * 86_400_000) return WEEKDAY.format(then);
  if (then.getFullYear() === now.getFullYear()) return DAY_MON.format(then);
  return MON_YR.format(then);
}

/** Full date divider label, e.g. "Today", "Yesterday", "19 Jun 2026". */
export function dayLabel(iso: string): string {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return '';
  const now = new Date();
  if (then.toDateString() === now.toDateString()) return 'Today';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (then.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return FULL_DATE.format(then);
}

export function clockTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : HHMM.format(d);
}

export function initials(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}
