/**
 * heroSlides.ts — rotating hero copy for the auth visual panel.
 *
 * Each slide carries a headline, the accent phrase within it, a body paragraph,
 * and three trust items. The iconKey maps to the panel's icon registry.
 *
 * Copy is curated — do NOT reword or add promotional language.
 */
import { useEffect, useRef, useState } from 'react';

export type HeroIconKey = 'shieldCheck' | 'ledger' | 'lock' | 'people' | 'doc';

export interface HeroTrustItem {
  title: string;
  sub: string;
  iconKey: HeroIconKey;
}

export interface HeroSlide {
  headline: string;
  /** The exact phrase within headline to render in accent style (italic + accent colour). */
  accent: string;
  body: string;
  items: [HeroTrustItem, HeroTrustItem, HeroTrustItem];
}

/* ── Login slides (5) ────────────────────────────────────────────────────── */
export const LOGIN_HERO_SLIDES: HeroSlide[] = [
  {
    headline: 'Where every home has a paper trail.',
    accent: 'paper trail',
    body: 'Records, access, payments, and documents kept clear from the first key turn.',
    items: [
      { iconKey: 'shieldCheck', title: 'Verified access',     sub: 'Only the right people reach the right records.' },
      { iconKey: 'ledger',      title: 'Living records',      sub: 'Leases, balances, and notices stay connected.' },
      { iconKey: 'lock',        title: 'Protected payments',  sub: 'Every transaction belongs to the account it came from.' },
    ],
  },
  {
    headline: 'Less guesswork. More ground truth.',
    accent: 'ground truth',
    body: 'Wyncrest keeps rental activity anchored to real records, not scattered messages.',
    items: [
      { iconKey: 'doc',    title: 'Clear records',    sub: 'Documents and account history stay organized.' },
      { iconKey: 'people', title: 'Role-safe entry',  sub: 'Each dashboard opens only what it should.' },
      { iconKey: 'ledger', title: 'Payment clarity',  sub: 'Balances and activity stay easy to trace.' },
    ],
  },
  {
    headline: 'The front door to every record.',
    accent: 'front door',
    body: 'Sign in once and continue with the documents, payments, and activity tied to your account.',
    items: [
      { iconKey: 'shieldCheck', title: 'Secure identity',      sub: 'Account access starts with verified credentials.' },
      { iconKey: 'doc',         title: 'Connected documents',  sub: 'Important records stay close to the workflow.' },
      { iconKey: 'ledger',      title: 'Account history',      sub: 'Actions leave a trail that can be reviewed.' },
    ],
  },
  {
    headline: 'Keep the home. Lose the fog.',
    accent: 'Lose the fog',
    body: 'Wyncrest turns rental activity into a clean, accountable system of record.',
    items: [
      { iconKey: 'people', title: 'Account clarity',   sub: 'Know what belongs where.' },
      { iconKey: 'doc',    title: 'Document order',    sub: 'Keep leases and notices in one reliable place.' },
      { iconKey: 'lock',   title: 'Controlled access', sub: 'Sensitive actions stay permission-aware.' },
    ],
  },
  {
    headline: 'Built for the quiet work behind every home.',
    accent: 'quiet work',
    body: 'Documents, payments, access, and records handled with calm precision.',
    items: [
      { iconKey: 'shieldCheck', title: 'Trusted entry',        sub: 'Secure sign-in for every account.' },
      { iconKey: 'ledger',      title: 'Record control',       sub: 'Important details stay traceable.' },
      { iconKey: 'lock',        title: 'Payment confidence',   sub: 'Financial activity stays connected to real records.' },
    ],
  },
];

/* ── Register slides (3) ──────────────────────────────────────────────────── */
export const REGISTER_HERO_SLIDES: HeroSlide[] = [
  {
    headline: 'Start with records that know where they belong.',
    accent: 'where they belong',
    body: 'Create an account and enter a rental workspace built around identity, access, and clear documentation.',
    items: [
      { iconKey: 'people',      title: 'Account setup',   sub: 'Your access begins with the right role.' },
      { iconKey: 'doc',         title: 'Document flow',   sub: 'Important records stay attached to your account.' },
      { iconKey: 'shieldCheck', title: 'Secure start',    sub: 'Sensitive workflows stay protected from day one.' },
    ],
  },
  {
    headline: 'Begin with clarity, not clutter.',
    accent: 'clarity',
    body: 'Wyncrest keeps setup focused, permissions clean, and records ready for the work ahead.',
    items: [
      { iconKey: 'shieldCheck', title: 'Clean onboarding',    sub: 'Only ask for what the system actually needs.' },
      { iconKey: 'people',      title: 'Permission-aware',    sub: 'Access is shaped by verified account type.' },
      { iconKey: 'ledger',      title: 'Record-ready',        sub: 'Documents and actions stay connected.' },
    ],
  },
  {
    headline: 'Open the right door first.',
    accent: 'right door',
    body: 'Create your account and continue into the workspace built for your access level.',
    items: [
      { iconKey: 'people', title: 'Guided setup',         sub: 'The right path begins at registration.' },
      { iconKey: 'lock',   title: 'Protected records',    sub: 'Account data stays permission-bound.' },
      { iconKey: 'ledger', title: 'Traceable activity',   sub: 'Important actions leave a reviewable trail.' },
    ],
  },
];

/* ── useRotatingSlides hook ──────────────────────────────────────────────── */
/**
 * Rotates through the given slides on an interval.
 *
 * Returns the current index and a pause/resume pair so callers can halt
 * rotation while an input is focused (better UX for screenfill panels).
 *
 * Reduced-motion: The interval still rotates; the *animation* is gated
 * separately in CSS via `@media (prefers-reduced-motion: reduce)`.
 */
export function useRotatingSlides(
  slides: HeroSlide[],
  intervalMs = 6000,
): {
  index: number;
  pause: () => void;
  resume: () => void;
} {
  const [index, setIndex] = useState(0);
  const pausedRef = useRef(false);

  useEffect(() => {
    if (slides.length <= 1) return;
    const id = setInterval(() => {
      if (!pausedRef.current) {
        setIndex((i) => (i + 1) % slides.length);
      }
    }, intervalMs);
    return () => clearInterval(id);
  }, [slides.length, intervalMs]);

  return {
    index,
    pause: () => { pausedRef.current = true; },
    resume: () => { pausedRef.current = false; },
  };
}
