import { cn } from '@/lib/cn';
import { brand } from '@/config/brand';

interface LogoMarkProps {
  size?: number;
  className?: string;
}

/**
 * Brand mark — a refined crest/shield with a subtle roofline chief, carrying the
 * configured brand initial (default "W"). The letter comes from brand config so
 * a future rename updates the mark automatically. Ink-teal, not the old red "N".
 */
export function LogoMark({ size = 32, className }: LogoMarkProps) {
  // Stable per-size gradient id (avoids collisions between multiple marks).
  const gid = `wc-crest-${size}`;
  return (
    <span
      className={cn('inline-flex items-center justify-center shrink-0', className)}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 40 40" width={size} height={size} fill="none" aria-hidden="true">
        <defs>
          <linearGradient id={gid} x1="20" y1="2" x2="20" y2="38" gradientUnits="userSpaceOnUse">
            {/* Ink-teal crest — premium, property-native; never brown/gold. */}
            <stop offset="0" stopColor="var(--color-brand-600, #0A7068)" />
            <stop offset="1" stopColor="var(--color-brand-900, #063E3A)" />
          </linearGradient>
        </defs>
        {/* Crest/shield with a soft peak at the top (a restrained roofline nod). */}
        <path
          d="M20 2.5 33.5 8.2 V18.5 C33.5 27.4 27.6 33.7 20 37.5 C12.4 33.7 6.5 27.4 6.5 18.5 V8.2 Z"
          fill={`url(#${gid})`}
        />
        {/* Top highlight for the glass-light feel. */}
        <path d="M20 2.5 33.5 8.2 V10 L20 4.6 6.5 10 V8.2 Z" fill="#FFFFFF" fillOpacity="0.18" />
        {/* Heraldic "chief" divider — crest structure without a house cliché. */}
        <path d="M9 13.5 H31" stroke="#FFFFFF" strokeOpacity="0.22" strokeWidth="1" />
        {/* Configured initial, set in the display serif. */}
        <text
          x="20"
          y="26.4"
          textAnchor="middle"
          fontFamily="'Fraunces', Georgia, serif"
          fontWeight="600"
          fontSize="17"
          fill="#FFFFFF"
          letterSpacing="0.2"
        >
          {brand.brandInitial}
        </text>
      </svg>
    </span>
  );
}

interface LogoProps {
  size?: number;
  /** Show the wordmark next to the mark. */
  wordmark?: boolean;
  /** Show the descriptor under the wordmark (WYNCREST / PROPERTY PLATFORM lockup). */
  descriptor?: boolean;
  className?: string;
}

/** Logo mark + configurable wordmark (and optional descriptor lockup). */
export function Logo({ size = 32, wordmark = true, descriptor = false, className }: LogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark size={size} />
      {wordmark && (
        <span className="inline-flex flex-col leading-none">
          <span
            className="font-display font-bold text-ink-950 leading-none"
            style={{ fontSize: Math.max(14, size * 0.56) }}
          >
            {brand.appName}
          </span>
          {descriptor && (
            <span
              className="font-mono uppercase text-ink-500 leading-none mt-1"
              style={{ fontSize: Math.max(8, size * 0.24), letterSpacing: '0.18em' }}
            >
              {brand.brandDescriptor}
            </span>
          )}
        </span>
      )}
    </span>
  );
}
