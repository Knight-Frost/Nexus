/**
 * BrandLockup — two variants of the brand mark for the auth shell.
 *
 * `panel`  — full identity lockup for the left visual panel (white tinted, over
 *            the dark hero image). Shield at a generous size, wordmark in
 *            Fraunces bold white, descriptor in IBM Plex Mono muted.
 *
 * `mark`   — compact logo tile for the form card header. The ink-teal shield
 *            inside a white rounded square with a subtle hairline and shadow —
 *            premium and intentional.
 *
 * Uses the real LogoMark (brand-initial W crest SVG) from Logo.tsx.
 * Auth-specific palette via --auth-panel-* and --auth-* vars from auth.css.
 */
import { Link } from 'react-router';
import { LogoMark } from '@/components/brand/Logo';
import { brand } from '@/config/brand';

/* ── Panel variant ───────────────────────────────────────────────────────── */
export function BrandLockup({ variant }: { variant: 'panel' | 'mark' }) {
  if (variant === 'panel') {
    return (
      <Link
        to="/"
        className="inline-flex items-center gap-3.5"
        aria-label={`${brand.appName} home`}
        style={{ textDecoration: 'none' }}
      >
        {/* Shield mark with a soft glowing ring / translucent backing so it
            reads as a premium product identity rather than a flat icon. */}
        <span
          style={{
            position: 'relative',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
          aria-hidden="true"
        >
          {/* Faint translucent halo — gives the mark weight without bulk */}
          <span
            style={{
              position: 'absolute',
              inset: -6,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(123,168,240,0.18) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />
          {/* Luminous blue shield (white W) so it reads vividly on the navy panel.
              Override the crest gradient stops to brighter blues for contrast. */}
          <span
            style={{
              position: 'relative',
              filter: 'drop-shadow(0 4px 10px rgba(7,21,47,0.45))',
              ['--color-brand-600' as string]: '#4D86E8',
              ['--color-brand-900' as string]: '#1B4DA8',
            } as React.CSSProperties}
          >
            <LogoMark size={48} />
          </span>
        </span>

        {/* Wordmark + descriptor */}
        <span style={{ display: 'flex', flexDirection: 'column', gap: 3, lineHeight: 1 }}>
          <span
            style={{
              fontFamily: 'var(--font-brand)',
              fontSize: '1.5rem',
              fontWeight: 700,
              letterSpacing: '-0.022em',
              color: 'var(--auth-panel-text)',
            }}
          >
            {brand.appName}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '9.5px',
              textTransform: 'uppercase',
              letterSpacing: '0.28em',
              color: 'var(--auth-panel-muted)',
            }}
          >
            {brand.brandDescriptor}
          </span>
        </span>
      </Link>
    );
  }

  /* ── Mark variant (form card) ────────────────────────────────────────────── */
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 58,
        height: 58,
        borderRadius: '1rem',
        background: '#FFFFFF',
        border: '1.5px solid rgba(0,0,0,0.07)',
        boxShadow: '0 2px 8px -2px rgba(0,0,0,0.12), 0 0 0 1px rgba(255,255,255,0.9) inset',
      }}
      aria-hidden="true"
    >
      <LogoMark size={36} />
    </span>
  );
}
