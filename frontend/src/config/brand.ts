/**
 * Centralised brand configuration — the SINGLE source of truth for every
 * user-facing brand string in the SPA.
 *
 * To rename the product, change the env values below (or their defaults here)
 * — do NOT hand-edit brand strings across pages. Components import `brand`
 * (and `pageTitle`) from here; no page should hardcode the app name, tagline,
 * descriptor, support name, or logo initial.
 *
 * Values are read from Vite env vars (`VITE_*`) with safe defaults so the app
 * works with zero configuration. The matching env keys live in `.env.example`.
 */

const env = import.meta.env;

export const brand = {
  /** Full product name, e.g. shown in the wordmark and titles. */
  appName: env.VITE_APP_NAME ?? 'Wyncrest',
  /** Compact name for tight spaces / manifest short_name. */
  appShortName: env.VITE_BRAND_SHORT_NAME ?? env.VITE_APP_NAME ?? 'Wyncrest',
  /** Single letter rendered inside the logo crest. */
  brandInitial: env.VITE_BRAND_INITIAL ?? 'W',
  /** Sub-label under the wordmark in the auth lockup. */
  brandDescriptor: env.VITE_BRAND_DESCRIPTOR ?? 'Property Platform',
  /** Primary positioning line. */
  tagline: env.VITE_BRAND_TAGLINE ?? 'A higher standard for modern renting.',
  /** Secondary positioning line. */
  secondaryTagline:
    env.VITE_BRAND_SECONDARY_TAGLINE ??
    'Every lease, payment, and record in trusted order.',
  /** Big headline on the auth scene (defaults to the tagline). */
  authHeadline: env.VITE_BRAND_AUTH_HEADLINE ?? env.VITE_BRAND_TAGLINE ?? 'A higher standard for modern renting.',
  /** Supporting copy under the auth headline. */
  authSubheadline:
    env.VITE_BRAND_AUTH_SUBHEADLINE ??
    'Manage listings, leases, documents, payments, and property records through one role-aware platform built for tenants, landlords, and admins.',
  /** Eyebrow line above the auth headline. */
  authEyebrow:
    env.VITE_BRAND_AUTH_EYEBROW ?? 'Verified rentals. Organized records. Clear control.',
  /**
   * Fragment of `authHeadline` to emphasise (teal italic). If not found in the
   * headline, it renders plainly — so a future tagline change degrades cleanly.
   */
  authHeadlineEmphasis: env.VITE_BRAND_AUTH_HEADLINE_EMPHASIS ?? 'modern renting.',
  /** Support contact email shown in the auth footer. */
  supportEmail: env.VITE_SUPPORT_EMAIL ?? 'support@wyncrest.com',
  /** Name used when referring to the support team. */
  supportName: env.VITE_SUPPORT_NAME ?? 'Wyncrest Support',
  /** Legal entity name (footers / legal copy). */
  legalName: env.VITE_BRAND_LEGAL_NAME ?? env.VITE_APP_NAME ?? 'Wyncrest',
} as const;

/**
 * Build a document title. `pageTitle('Payments')` → "Payments | Wyncrest";
 * `pageTitle()` → "Wyncrest | Property Platform".
 */
export function pageTitle(section?: string): string {
  return section
    ? `${section} | ${brand.appName}`
    : `${brand.appName} | ${brand.brandDescriptor}`;
}

export type Brand = typeof brand;
