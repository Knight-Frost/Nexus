/**
 * AuthCard — the right-side form card in the split-screen auth shell.
 *
 * Adapts to light/dark mode via --auth-* CSS vars defined in auth.css.
 * Uses BrandLockup mark variant: white tile, subtle shadow + hairline,
 * premium and intentional.
 */
import type { ReactNode } from 'react';
import { BrandLockup } from './BrandLockup';

interface AuthCardProps {
  /** Card heading (e.g. "Welcome back") */
  title: string;
  /** Subtitle copy under the heading */
  subtitle?: ReactNode;
  /** aria-label for the card region */
  label?: string;
  children: ReactNode;
}

export function AuthCard({ title, subtitle, label, children }: AuthCardProps) {
  return (
    <div aria-label={label} role="region">
      {/* Brand mark tile */}
      <div className="mb-6 flex justify-center">
        <BrandLockup variant="mark" />
      </div>

      {/* Title */}
      <h2
        className="text-center"
        style={{
          fontFamily: 'var(--font-auth-ui)',
          fontSize: '1.75rem',
          fontWeight: 800,
          letterSpacing: '-0.02em',
          lineHeight: 1.15,
          color: 'var(--auth-text-primary)',
          margin: 0,
        }}
      >
        {title}
      </h2>

      {/* Subtitle */}
      {subtitle && (
        <p
          className="text-center"
          style={{
            marginTop: '0.375rem',
            fontSize: '0.875rem',
            fontWeight: 500,
            lineHeight: 1.55,
            color: 'var(--auth-text-muted)',
          }}
        >
          {subtitle}
        </p>
      )}

      {/* Form content */}
      <div style={{ marginTop: '1.75rem' }}>{children}</div>
    </div>
  );
}
