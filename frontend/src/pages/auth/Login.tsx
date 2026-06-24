import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useAuth } from '@/context/auth';
import { fieldErrors } from '@/lib/api';
import { authApi, type AuthProviders } from '@/lib/endpoints';
import type { ApiError } from '@/lib/types';
import {
  AuthShell,
  AuthVisualPanel,
  AuthCard,
  AuthIcons,
  GoogleIcon,
  AuthTextField,
  AuthPasswordField,
  AuthFieldLabel,
  AuthFieldError,
  AuthErrorBanner,
  AuthDivider,
} from '@/components/auth';

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/app';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  /* Notice for unavailable SSO options — state-driven, no toast dependency */
  const [ssoNotice, setSsoNotice] = useState<string | null>(null);
  const [providers, setProviders] = useState<AuthProviders | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Fetch which social providers are available on mount.
  useEffect(() => {
    authApi.authProviders().then(setProviders).catch(() => {
      setProviders({ google: false });
    });
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});
    setFormError(null);
    setSsoNotice(null);
    try {
      await login(email, password, remember);
      navigate(from, { replace: true });
    } catch (err) {
      const apiErr = err as ApiError;
      const fields = fieldErrors(apiErr);
      setErrors(fields);
      if (Object.keys(fields).length === 0) setFormError(apiErr.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleLogin() {
    setGoogleLoading(true);
    setSsoNotice(null);
    try {
      const url = await authApi.googleRedirect();
      window.location.href = url;
    } catch {
      setSsoNotice('Could not initiate Google sign-in. Please try again.');
      setGoogleLoading(false);
    }
  }

  return (
    <AuthShell
      panel={<AuthVisualPanel mode="login" />}
    >
      <AuthCard
        label="Welcome back"
        title="Welcome back"
        subtitle="Continue to your secure rental workspace."
      >
        <form
          onSubmit={onSubmit}
          noValidate
          style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}
        >
          {formError && <AuthErrorBanner message={formError} />}

          {/* SSO unavailability notice */}
          {ssoNotice && (
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
              {ssoNotice}
            </div>
          )}

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

          <label className="block">
            <AuthFieldLabel>Password</AuthFieldLabel>
            <AuthPasswordField
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              invalid={!!errors.password}
              placeholder="Enter your password"
              autoComplete="current-password"
              withIcon
            />
            <AuthFieldError message={errors.password} />
          </label>

          {/* Remember me + Forgot password */}
          <div className="flex items-center justify-between">
            <label
              className="flex cursor-pointer items-center gap-2"
              style={{ fontSize: '0.875rem', color: 'var(--auth-text-primary)' }}
            >
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 4,
                  accentColor: 'var(--auth-focus)',
                  cursor: 'pointer',
                }}
              />
              Remember me
            </label>
            <Link
              to="/forgot-password"
              style={{
                fontSize: '0.875rem',
                fontWeight: 700,
                color: 'var(--auth-focus)',
                textDecoration: 'none',
              }}
            >
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="auth-btn-primary"
            style={{ marginTop: '0.125rem' }}
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
                Signing in&hellip;
              </>
            ) : (
              <>
                Sign in
                <AuthIcons.arrow />
              </>
            )}
          </button>
        </form>

        {/* Social sign-in — shown ONLY when Google is configured server-side */}
        {providers?.google && (
          <div style={{ marginTop: '1.25rem' }}>
            <AuthDivider />
            <div style={{ marginTop: '1rem' }}>
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={googleLoading}
                aria-label="Continue with Google"
                className="auth-btn-social"
              >
                {googleLoading ? (
                  <span
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      border: '2px solid var(--auth-border)',
                      borderTopColor: 'var(--auth-focus)',
                      display: 'inline-block',
                      animation: 'spin 0.7s linear infinite',
                    }}
                  />
                ) : (
                  <GoogleIcon size={18} />
                )}
                Continue with Google
              </button>
            </div>
          </div>
        )}

        <p
          className="text-center"
          style={{
            fontSize: '0.875rem',
            color: 'var(--auth-text-muted)',
            marginTop: '1.25rem',
          }}
        >
          Don&rsquo;t have an account?{' '}
          <Link
            to="/register"
            style={{ fontWeight: 700, color: 'var(--auth-focus)', textDecoration: 'none' }}
          >
            Register
          </Link>
        </p>

        {/* Role hint */}
        <div
          style={{
            marginTop: '1.25rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.625rem',
            padding: '0.75rem',
            borderRadius: '0.75rem',
            background: 'var(--auth-surface)',
            border: '1px solid var(--auth-border)',
          }}
        >
          <span style={{ color: 'var(--auth-text-muted)', flexShrink: 0, marginTop: 1 }}>
            <AuthIcons.people width={15} height={15} />
          </span>
          <p
            style={{
              fontSize: '0.75rem',
              color: 'var(--auth-text-muted)',
              lineHeight: 1.55,
              margin: 0,
            }}
          >
            Your workspace opens according to your verified account access.
          </p>
        </div>
      </AuthCard>
    </AuthShell>
  );
}
