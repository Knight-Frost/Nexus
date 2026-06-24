import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '@/context/auth';
import { fieldErrors } from '@/lib/api';
import { cn } from '@/lib/cn';
import type { ApiError, UserType } from '@/lib/types';
import { brand } from '@/config/brand';
import {
  AuthShell,
  AuthVisualPanel,
  AuthCard,
  AuthIcons,
  AuthTextField,
  AuthPasswordField,
  AuthFieldLabel,
  AuthFieldError,
  AuthErrorBanner,
  PasswordChecklist,
} from '@/components/auth';

const DIAL_CODES = [
  { code: '+233', label: 'GH' },
  { code: '+234', label: 'NG' },
  { code: '+254', label: 'KE' },
  { code: '+27', label: 'ZA' },
  { code: '+44', label: 'UK' },
  { code: '+1', label: 'US' },
];

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    password: '',
    password_confirmation: '',
  });
  const [dial, setDial] = useState('+233');
  const [userType, setUserType] = useState<UserType>('tenant');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});
    setFormError(null);
    try {
      await register({
        ...form,
        phone: form.phone ? `${dial} ${form.phone}` : undefined,
        user_type: userType,
      });
      navigate('/app', { replace: true });
    } catch (err) {
      const apiErr = err as ApiError;
      const fields = fieldErrors(apiErr);
      setErrors(fields);
      if (Object.keys(fields).length === 0) setFormError(apiErr.message);
    } finally {
      setSubmitting(false);
    }
  }

  // Roles limited to tenant | landlord — admin accounts are not self-registered
  // (confirmed: backend RegisterRequest validates user_type in ['tenant','landlord'])
  const roles: { value: UserType; title: string; desc: string }[] = [
    { value: 'tenant', title: 'Tenant', desc: 'Find & rent a home' },
    { value: 'landlord', title: 'Landlord', desc: 'List & manage rentals' },
  ];

  return (
    <AuthShell
      panel={<AuthVisualPanel mode="register" />}
    >
      <AuthCard
        label="Create your account"
        title="Create your account"
        subtitle={`Set up ${brand.appName} access with the details your workspace needs.`}
      >
        <form
          onSubmit={onSubmit}
          noValidate
          style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
        >
          {formError && <AuthErrorBanner message={formError} />}

          {/* Role selector — tenant | landlord only (no admin registration) */}
          <div>
            <span
              style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                color: 'var(--auth-text-muted)',
              }}
            >
              I am a&hellip;
            </span>
            <div className="grid grid-cols-2 gap-2.5" role="radiogroup" aria-label="Account type">
              {roles.map((r) => {
                const on = userType === r.value;
                return (
                  <button
                    type="button"
                    key={r.value}
                    role="radio"
                    aria-checked={on}
                    onClick={() => setUserType(r.value)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.625rem',
                      padding: '0.625rem 0.875rem',
                      borderRadius: '0.75rem',
                      border: on
                        ? '1.5px solid var(--auth-focus)'
                        : '1.5px solid var(--auth-input-border)',
                      background: on ? 'var(--auth-focus-ring)' : 'var(--auth-input-bg)',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      textAlign: 'left',
                    }}
                    className={cn(!on && 'hover:border-[var(--auth-focus)]')}
                  >
                    <AuthIcons.person
                      width={18}
                      height={18}
                      style={{ color: on ? 'var(--auth-focus)' : 'var(--auth-text-muted)', flexShrink: 0 }}
                    />
                    <span>
                      <span
                        style={{
                          display: 'block',
                          fontSize: '0.875rem',
                          fontWeight: 600,
                          color: on ? 'var(--auth-focus)' : 'var(--auth-text-primary)',
                        }}
                      >
                        {r.title}
                      </span>
                      <span
                        style={{
                          display: 'block',
                          fontSize: '0.75rem',
                          color: 'var(--auth-text-muted)',
                        }}
                      >
                        {r.desc}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* First + last name — side by side */}
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <AuthFieldLabel>First name</AuthFieldLabel>
              <AuthTextField
                value={form.first_name}
                onChange={set('first_name')}
                invalid={!!errors.first_name}
                placeholder="First"
                autoComplete="given-name"
                required
              />
              <AuthFieldError message={errors.first_name} />
            </label>
            <label className="block">
              <AuthFieldLabel>Last name</AuthFieldLabel>
              <AuthTextField
                value={form.last_name}
                onChange={set('last_name')}
                invalid={!!errors.last_name}
                placeholder="Last"
                autoComplete="family-name"
                required
              />
              <AuthFieldError message={errors.last_name} />
            </label>
          </div>

          {/* Email */}
          <label className="block">
            <AuthFieldLabel>Email</AuthFieldLabel>
            <AuthTextField
              type="email"
              value={form.email}
              onChange={set('email')}
              invalid={!!errors.email}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
            <AuthFieldError message={errors.email} />
          </label>

          {/* Phone (optional) */}
          <label className="block">
            <AuthFieldLabel hint="Optional">Phone</AuthFieldLabel>
            <div className="flex gap-2.5">
              <div className="relative">
                <select
                  value={dial}
                  onChange={(e) => setDial(e.target.value)}
                  aria-label="Country code"
                  className="auth-select"
                >
                  {DIAL_CODES.map((d) => (
                    <option key={d.code} value={d.code}>
                      {d.code} {d.label}
                    </option>
                  ))}
                </select>
                <AuthIcons.chevron
                  width={14}
                  height={14}
                  style={{
                    pointerEvents: 'none',
                    position: 'absolute',
                    right: '0.5rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--auth-text-muted)',
                  }}
                />
              </div>
              <AuthTextField
                type="tel"
                value={form.phone}
                onChange={set('phone')}
                invalid={!!errors.phone}
                placeholder="55 123 4567"
                autoComplete="tel"
                className="flex-1"
              />
            </div>
            <AuthFieldError message={errors.phone} />
          </label>

          {/* Password */}
          <label className="block">
            <AuthFieldLabel>Password</AuthFieldLabel>
            <AuthPasswordField
              value={form.password}
              onChange={set('password')}
              invalid={!!errors.password}
              placeholder="Create a strong password"
              autoComplete="new-password"
            />
            <AuthFieldError message={errors.password} />
            <PasswordChecklist value={form.password} />
          </label>

          {/* Confirm password */}
          <label className="block">
            <AuthFieldLabel>Confirm password</AuthFieldLabel>
            <AuthPasswordField
              value={form.password_confirmation}
              onChange={set('password_confirmation')}
              invalid={!!errors.password_confirmation}
              placeholder="Confirm your password"
              autoComplete="new-password"
            />
            <AuthFieldError message={errors.password_confirmation} />
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="auth-btn-primary"
            style={{ marginTop: '0.25rem' }}
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
                Creating account&hellip;
              </>
            ) : (
              <>
                Create account
                <AuthIcons.arrow />
              </>
            )}
          </button>

          <p
            className="text-center"
            style={{ fontSize: '0.875rem', color: 'var(--auth-text-muted)' }}
          >
            Already have an account?{' '}
            <Link
              to="/login"
              style={{ fontWeight: 700, color: 'var(--auth-focus)', textDecoration: 'none' }}
            >
              Sign in
            </Link>
          </p>

          {/* Role hint */}
          <p
            className="text-center"
            style={{
              fontSize: '0.75rem',
              color: 'var(--auth-text-muted)',
              marginTop: '0.25rem',
            }}
          >
            Your dashboard and permissions are created from your verified account role.
          </p>
        </form>
      </AuthCard>
    </AuthShell>
  );
}
