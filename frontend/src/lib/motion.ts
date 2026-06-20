/**
 * Shared Framer Motion choreography for the editorial app.
 *
 * Philosophy (learned from Camp Burnt Gin): use motion for *choreography*
 * (page/section enter, staggered lists, modals/drawers) and let CSS handle
 * micro-interactions (hover lift, focus rings). Keep durations in a small set
 * of tiers so the whole app feels like one hand.
 *
 * Every consumer should wrap with `<MotionConfig reducedMotion="user">` (done
 * once in App) OR gate variants with the `useReducedMotion()` hook — Framer
 * then collapses transforms to instant for users who ask for less motion.
 */
import type { Variants, Transition } from 'framer-motion';

/* Easing — the landing's signature "soft out" curve. */
export const EASE_OUT_SOFT = [0.16, 1, 0.3, 1] as const;

/* Duration tiers (seconds). 0.15 micro · 0.3 hover · 0.5 enter. */
export const DUR = { micro: 0.15, hover: 0.3, enter: 0.5 } as const;

export const springSoft: Transition = { type: 'spring', stiffness: 300, damping: 30 };

/** Fade + rise. The default "this element just arrived" motion. */
export const fadeRise: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: DUR.enter, ease: EASE_OUT_SOFT },
  },
};

/** Container that staggers its children's `fadeRise` (or any item variant). */
export const staggerContainer = (stagger = 0.06, delayChildren = 0.04): Variants => ({
  hidden: {},
  show: {
    transition: { staggerChildren: stagger, delayChildren },
  },
});

/** Lightweight item for use inside a stagger container. */
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE_OUT_SOFT } },
};

/** Modal/dialog panel: scale-in from slightly small. */
export const modalPanel: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: 8 },
  show: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.28, ease: EASE_OUT_SOFT } },
  exit: { opacity: 0, scale: 0.97, y: 6, transition: { duration: 0.18, ease: 'easeIn' } },
};

/** Backdrop fade for overlays. */
export const overlayFade: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: DUR.hover } },
  exit: { opacity: 0, transition: { duration: DUR.micro } },
};

/** Right-hand drawer (guide panels, filters). */
export const drawerRight: Variants = {
  hidden: { x: '100%' },
  show: { x: 0, transition: springSoft },
  exit: { x: '100%', transition: { duration: 0.2, ease: 'easeIn' } },
};

/** Standard "section enters as it scrolls into view" props for <motion.* />. */
export const inViewSection = {
  initial: 'hidden',
  whileInView: 'show',
  viewport: { once: true, margin: '0px 0px -10% 0px' },
  variants: fadeRise,
} as const;
