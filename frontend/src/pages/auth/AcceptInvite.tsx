import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { fieldErrors } from '@/lib/api';
import { authApi } from '@/lib/endpoints';
import type { ApiError } from '@/lib/types';
import {
  AuthShell,
  AuthVisualPanel,
  AuthCard,
  AuthIcons,
  AuthPasswordField,
  AuthFieldLabel,
  AuthFieldError,
  AuthErrorBanner,
  PasswordChecklist,
  DEFAULT_TRUST_ITEMS,
} from '@/components/auth';

/**
 * AcceptInvite — an invited admin sets their password and activates their
 * account. Reached from the emailed set-password link (/accept-invite?token&email).
 * The token is the only guard; the backend verifies it via the `admins` broker.
 */
export function AcceptInvite() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const email = searchParams.get('email') ?? '';

  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  if (!token || !email) {
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
        <AuthCard label="Admin invitation" title="Invalid link">
          <p
            className="text-center"
            style={{ fontSize: '0.875rem', color: 'var(--auth-text-muted)', marginBottom: '1.25rem' }}
          >
            This invitation link is missing required parameters. Ask a super admin to resend your invite.
          </p>
          <p className="text-center">
            <Link to="/login" style={{ fontWeight: 700, color: 'var(--auth-focus)', textDecoration: 'none' }}>
              Back to sign in
            </Link>
          </p>
        </AuthCard>
      </AuthShell>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});
    setFormError(null);
    try {
      await authApi.acceptAdminInvite({
        token,
        email,
        password,
        password_confirmation: passwordConfirmation,
      });
      navigate('/login', {
        replace: true,
        state: { notice: 'Your admin account is ready. You can now sign in.' },
      });
    } catch (err) {
      const apiErr = err as ApiError;
      const fields = fieldErrors(apiErr);
      setErrors(fields);
      if (Object.keys(fields).length === 0)
        setFormError(apiErr.message ?? 'This invitation link is invalid or has expired.');
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
        label="Admin invitation"
        title="Set your password"
        subtitle={
          <>
            Activate the admin account for{' '}
            <span style={{ fontWeight: 600, color: 'var(--auth-text-primary)' }}>{email}</span>.
          </>
        }
      >
        <form onSubmit={onSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
          {formError && <AuthErrorBanner message={formError} />}

          {errors.email && <AuthErrorBanner message={errors.email} />}

          <label className="block">
            <AuthFieldLabel>Password</AuthFieldLabel>
            <AuthPasswordField
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              invalid={!!errors.password}
              placeholder="Create a strong password"
              autoComplete="new-password"
              withIcon
            />
            <AuthFieldError message={errors.password} />
            <PasswordChecklist value={password} />
          </label>

          <label className="block">
            <AuthFieldLabel>Confirm password</AuthFieldLabel>
            <AuthPasswordField
              value={passwordConfirmation}
              onChange={(e) => setPasswordConfirmation(e.target.value)}
              invalid={!!errors.password_confirmation}
              placeholder="Confirm your password"
              autoComplete="new-password"
            />
            <AuthFieldError message={errors.password_confirmation} />
          </label>

          <button type="submit" disabled={submitting} className="auth-btn-primary">
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
                Activating&hellip;
              </>
            ) : (
              <>
                Activate account
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
      </AuthCard>
    </AuthShell>
  );
}
