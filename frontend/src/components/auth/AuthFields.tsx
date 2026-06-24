/* eslint-disable react-refresh/only-export-components -- intentional shared-parts module */
/**
 * AuthFields — form primitives for the navy split-screen auth system.
 *
 * All elements use --auth-* CSS vars from auth.css (scoped to [data-auth-shell]).
 * This keeps the styling isolated from the app's glass/teal token system.
 */
import { forwardRef, useState, type ReactNode, type SVGProps } from 'react';
import { cn } from '@/lib/cn';

/* ============================ Icons ===================================== */
function I({ children, ...p }: SVGProps<SVGSVGElement> & { children: ReactNode }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...p}
    >
      {children}
    </svg>
  );
}

export const AuthIcons = {
  mail: (p: SVGProps<SVGSVGElement>) => (
    <I {...p}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </I>
  ),
  lock: (p: SVGProps<SVGSVGElement>) => (
    <I {...p}>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </I>
  ),
  eye: (p: SVGProps<SVGSVGElement>) => (
    <I {...p}>
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </I>
  ),
  eyeOff: (p: SVGProps<SVGSVGElement>) => (
    <I {...p}>
      <path d="M3 3l18 18M10.6 10.6a3 3 0 0 0 4 4" />
      <path d="M9.4 5.3A9.7 9.7 0 0 1 12 5c6 0 10 7 10 7a17 17 0 0 1-3.2 3.9M6.3 6.3A17 17 0 0 0 2 12s4 7 10 7a9.6 9.6 0 0 0 3-.5" />
    </I>
  ),
  arrow: (p: SVGProps<SVGSVGElement>) => (
    <I {...p}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </I>
  ),
  arrowLeft: (p: SVGProps<SVGSVGElement>) => (
    <I {...p}>
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </I>
  ),
  person: (p: SVGProps<SVGSVGElement>) => (
    <I {...p}>
      <circle cx="12" cy="8" r="3.4" />
      <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
    </I>
  ),
  people: (p: SVGProps<SVGSVGElement>) => (
    <I {...p}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0M16 5.2a3.2 3.2 0 0 1 0 5.6M16.5 19a5.5 5.5 0 0 0-2.6-4.7" />
    </I>
  ),
  chevron: (p: SVGProps<SVGSVGElement>) => (
    <I {...p}>
      <path d="m6 9 6 6 6-6" />
    </I>
  ),
};

/* ============================ Google icon ================================ */
export function GoogleIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35 24 35c-6.1 0-11-4.9-11-11s4.9-11 11-11c2.8 0 5.4 1.1 7.3 2.8l5.7-5.7C33.5 6.2 29 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c2.8 0 5.4 1.1 7.3 2.8l5.7-5.7C33.5 6.2 29 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35 26.7 36 24 36c-5.3 0-9.7-2.6-11.3-7l-6.5 5C9.6 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.2 5.2C39.9 36.3 44 31 44 24c0-1.2-.1-2.3-.4-3.5z" />
    </svg>
  );
}

/* ============================ Field label ================================ */
export function AuthFieldLabel({
  children,
  hint,
}: {
  children: ReactNode;
  hint?: string;
}) {
  return (
    <span className="mb-1.5 flex items-baseline justify-between">
      <span
        style={{
          fontSize: '0.8125rem',
          fontWeight: 600,
          color: 'var(--auth-text-primary)',
        }}
      >
        {children}
      </span>
      {hint && (
        <span style={{ fontSize: '0.75rem', color: 'var(--auth-text-muted)' }}>
          {hint}
        </span>
      )}
    </span>
  );
}

/* ============================ Text input ================================= */
export const AuthTextField = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & {
    invalid?: boolean;
    leftIcon?: ReactNode;
  }
>(function AuthTextField({ invalid, leftIcon, className, ...props }, ref) {
  const cls = cn(
    'auth-field-input',
    leftIcon && 'has-left-icon',
    className,
  );

  if (leftIcon) {
    return (
      <span className="relative block">
        <span
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
          style={{ color: 'var(--auth-text-muted)' }}
        >
          {leftIcon}
        </span>
        <input
          ref={ref}
          className={cls}
          aria-invalid={invalid || undefined}
          {...props}
        />
      </span>
    );
  }

  return (
    <input
      ref={ref}
      className={cn('auth-field-input', className)}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
});

/* ============================ Password input ============================ */
export function AuthPasswordField({
  value,
  onChange,
  placeholder,
  invalid,
  autoComplete,
  withIcon = false,
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  invalid?: boolean;
  autoComplete?: string;
  withIcon?: boolean;
}) {
  const [show, setShow] = useState(false);

  return (
    <span className="relative block">
      {withIcon && (
        <span
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
          style={{ color: 'var(--auth-text-muted)' }}
        >
          <AuthIcons.lock />
        </span>
      )}
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-invalid={invalid || undefined}
        className={cn(
          'auth-field-input has-right-icon',
          withIcon && 'has-left-icon',
        )}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? 'Hide password' : 'Show password'}
        style={{
          position: 'absolute',
          right: '0.625rem',
          top: '50%',
          transform: 'translateY(-50%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 32,
          height: 32,
          borderRadius: '0.5rem',
          color: 'var(--auth-text-muted)',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          transition: 'color 0.15s',
        }}
      >
        {show ? <AuthIcons.eyeOff /> : <AuthIcons.eye />}
      </button>
    </span>
  );
}

/* ============================ Password checklist ======================== */
/** Live password rules. Mirrors the backend policy: 8+ chars, mixed case, a number. */
export function PasswordChecklist({ value }: { value: string }) {
  const rules = [
    { label: 'At least 8 characters', ok: value.length >= 8 },
    { label: 'Upper & lowercase letters', ok: /[a-z]/.test(value) && /[A-Z]/.test(value) },
    { label: 'At least one number', ok: /\d/.test(value) },
  ];

  return (
    <ul className="mt-2 grid gap-1">
      {rules.map((r) => (
        <li key={r.label} className="flex items-center gap-2">
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 15,
              height: 15,
              borderRadius: '50%',
              border: `1.5px solid ${r.ok ? 'var(--auth-focus)' : 'var(--auth-border)'}`,
              background: r.ok ? 'var(--auth-focus-ring)' : 'transparent',
              color: r.ok ? 'var(--auth-focus)' : 'transparent',
              flexShrink: 0,
              transition: 'all 0.15s',
            }}
          >
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 13l4 4L19 7" />
            </svg>
          </span>
          <span
            style={{
              fontSize: '0.75rem',
              color: r.ok ? 'var(--auth-focus)' : 'var(--auth-text-muted)',
              transition: 'color 0.15s',
            }}
          >
            {r.label}
          </span>
        </li>
      ))}
    </ul>
  );
}

/* ============================ Error banner ============================== */
export function AuthErrorBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      style={{
        borderRadius: '0.75rem',
        border: '1px solid rgba(192,32,24,0.25)',
        background: 'rgba(192,32,24,0.06)',
        padding: '0.75rem 1rem',
        fontSize: '0.875rem',
        color: '#B42318',
      }}
    >
      {message}
    </div>
  );
}

/* ============================ Info banner =============================== */
export function AuthInfoBanner({ message }: { message: string }) {
  return (
    <div
      role="status"
      style={{
        borderRadius: '0.75rem',
        border: '1px solid rgba(32,89,192,0.20)',
        background: 'rgba(32,89,192,0.06)',
        padding: '0.75rem 1rem',
        fontSize: '0.875rem',
        color: 'var(--auth-focus)',
      }}
    >
      {message}
    </div>
  );
}

/* ============================ Success banner =========================== */
export function AuthSuccessBanner({ message }: { message: string }) {
  return (
    <div
      style={{
        borderRadius: '0.75rem',
        border: '1px solid rgba(32,89,192,0.20)',
        background: 'rgba(32,89,192,0.08)',
        padding: '1rem',
        fontSize: '0.875rem',
        color: 'var(--auth-focus)',
        textAlign: 'center' as const,
      }}
    >
      {message}
    </div>
  );
}

/* ============================ "Or" divider ============================= */
export function AuthDivider({ label = 'Or continue with' }: { label?: string }) {
  return (
    <div className="flex items-center gap-4">
      <span style={{ flex: 1, height: 1, background: 'var(--auth-divider)' }} />
      <span
        style={{
          fontSize: '11px',
          fontWeight: 600,
          textTransform: 'uppercase' as const,
          letterSpacing: '0.16em',
          color: 'var(--auth-text-muted)',
          whiteSpace: 'nowrap' as const,
        }}
      >
        {label}
      </span>
      <span style={{ flex: 1, height: 1, background: 'var(--auth-divider)' }} />
    </div>
  );
}

/* ============================ Field error text ========================= */
export function AuthFieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <span
      style={{
        display: 'block',
        marginTop: '0.25rem',
        fontSize: '0.75rem',
        color: '#C02018',
      }}
    >
      {message}
    </span>
  );
}

/* ============================ Spinner ================================== */
export function AuthSpinner({ size = 20 }: { size?: number }) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        borderRadius: '50%',
        border: '2px solid rgba(255,255,255,0.35)',
        borderTopColor: '#FFFFFF',
        animation: 'spin 0.7s linear infinite',
      }}
    />
  );
}
