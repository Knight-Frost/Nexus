import { useState } from 'react';
import { Link } from 'react-router';
import { fieldErrors } from '@/lib/api';
import { authApi } from '@/lib/endpoints';
import type { ApiError } from '@/lib/types';
import {
  AuthShell,
  AuthVisualPanel,
  AuthCard,
  AuthIcons,
  AuthTextField,
  AuthFieldLabel,
  AuthFieldError,
  AuthErrorBanner,
  AuthSuccessBanner,
  DEFAULT_TRUST_ITEMS,
} from '@/components/auth';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});
    setFormError(null);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch (err) {
      const apiErr = err as ApiError;
      const fields = fieldErrors(apiErr);
      setErrors(fields);
      if (Object.keys(fields).length === 0) setFormError(apiErr.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      panel={
        <AuthVisualPanel
          headline="A calmer way to manage rentals."
          accentWords={['manage rentals']}
          supporting="Secure access for tenants, landlords, and admins. Everything in one place."
          trustItems={DEFAULT_TRUST_ITEMS}
        />
      }
    >
      <AuthCard
        label="Reset password"
        title="Forgot password?"
        subtitle="We'll send a reset link to your email."
      >
        {sent ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', textAlign: 'center' }}>
            <AuthSuccessBanner message="If that email exists, a reset link has been sent. Check your inbox (and spam folder)." />
            <Link
              to="/login"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.375rem',
                fontSize: '0.875rem',
                fontWeight: 500,
                color: 'var(--auth-focus)',
                textDecoration: 'none',
              }}
            >
              <AuthIcons.arrowLeft width={16} height={16} />
              Back to sign in
            </Link>
          </div>
        ) : (
          <form
            onSubmit={onSubmit}
            noValidate
            style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}
          >
            {formError && <AuthErrorBanner message={formError} />}

            <label className="block">
              <AuthFieldLabel>Email</AuthFieldLabel>
              <AuthTextField
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                invalid={!!errors.email}
                placeholder="you@example.com"
                autoComplete="email"
                leftIcon={<AuthIcons.mail />}
                required
              />
              <AuthFieldError message={errors.email} />
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="auth-btn-primary"
            >
              {submitting ? (
                <>
                  <span
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      border: '2px solid rgba(255,255,255,0.35)',
                      borderTopColor: '#fff',
                      display: 'inline-block',
                      animation: 'spin 0.7s linear infinite',
                    }}
                  />
                  Sending&hellip;
                </>
              ) : (
                <>
                  Send reset link
                  <AuthIcons.arrow />
                </>
              )}
            </button>

            <p className="text-center" style={{ fontSize: '0.875rem' }}>
              <Link
                to="/login"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  fontWeight: 500,
                  color: 'var(--auth-focus)',
                  textDecoration: 'none',
                }}
              >
                <AuthIcons.arrowLeft width={14} height={14} />
                Back to sign in
              </Link>
            </p>
          </form>
        )}
      </AuthCard>
    </AuthShell>
  );
}
