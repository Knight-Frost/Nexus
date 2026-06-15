import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '@/context/auth';
import { fieldErrors } from '@/lib/api';
import { cn } from '@/lib/cn';
import type { ApiError, UserType } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { AuthLayout } from './AuthLayout';

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
      await register({ ...form, phone: form.phone || undefined, user_type: userType });
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

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Join Nexus as a tenant or a landlord — you can manage everything in one place."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-brand-700 hover:text-brand-800">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {formError && (
          <div className="rounded-xl border border-danger-500/20 bg-danger-50 px-4 py-3 text-sm text-danger-600" role="alert">
            {formError}
          </div>
        )}

        {/* Role selector */}
        <div>
          <span className="mb-1.5 block text-sm font-medium text-ink-800">I am a…</span>
          <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Account type">
            {(['tenant', 'landlord'] as UserType[]).map((t) => (
              <button
                type="button"
                key={t}
                role="radio"
                aria-checked={userType === t}
                onClick={() => setUserType(t)}
                className={cn(
                  'rounded-xl border px-4 py-3 text-left text-sm font-medium capitalize transition',
                  userType === t
                    ? 'border-brand-600 bg-brand-50 text-brand-800 ring-1 ring-brand-600'
                    : 'border-ink-200 text-ink-600 hover:border-ink-300',
                )}
              >
                {t}
                <span className="mt-0.5 block text-xs font-normal text-ink-500">
                  {t === 'tenant' ? 'Find & rent a home' : 'List & manage rentals'}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="First name" error={errors.first_name}>
            {(id, invalid) => (
              <Input id={id} required invalid={invalid} value={form.first_name} onChange={set('first_name')} autoComplete="given-name" />
            )}
          </Field>
          <Field label="Last name" error={errors.last_name}>
            {(id, invalid) => (
              <Input id={id} required invalid={invalid} value={form.last_name} onChange={set('last_name')} autoComplete="family-name" />
            )}
          </Field>
        </div>

        <Field label="Email" error={errors.email}>
          {(id, invalid) => (
            <Input id={id} type="email" required invalid={invalid} value={form.email} onChange={set('email')} autoComplete="email" placeholder="you@example.com" />
          )}
        </Field>

        <Field label="Phone" hint="Optional" error={errors.phone}>
          {(id, invalid) => (
            <Input id={id} type="tel" invalid={invalid} value={form.phone} onChange={set('phone')} autoComplete="tel" />
          )}
        </Field>

        <Field label="Password" hint="At least 8 characters, with mixed case and a number." error={errors.password}>
          {(id, invalid) => (
            <Input id={id} type="password" required invalid={invalid} value={form.password} onChange={set('password')} autoComplete="new-password" />
          )}
        </Field>

        <Field label="Confirm password" error={errors.password_confirmation}>
          {(id, invalid) => (
            <Input id={id} type="password" required invalid={invalid} value={form.password_confirmation} onChange={set('password_confirmation')} autoComplete="new-password" />
          )}
        </Field>

        <Button type="submit" className="w-full" loading={submitting} size="lg">
          Create account
        </Button>
      </form>
    </AuthLayout>
  );
}
