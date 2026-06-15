import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useAuth } from '@/context/auth';
import { fieldErrors } from '@/lib/api';
import type { ApiError } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { AuthLayout } from './AuthLayout';

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/app';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});
    setFormError(null);
    try {
      await login(email, password);
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

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to manage your properties, contracts, and payments."
      footer={
        <>
          New to Nexus?{' '}
          <Link to="/register" className="font-medium text-brand-700 hover:text-brand-800">
            Create an account
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

        <Field label="Email" error={errors.email}>
          {(id, invalid) => (
            <Input
              id={id}
              type="email"
              autoComplete="email"
              required
              invalid={invalid}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          )}
        </Field>

        <Field label="Password" error={errors.password}>
          {(id, invalid) => (
            <Input
              id={id}
              type="password"
              autoComplete="current-password"
              required
              invalid={invalid}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          )}
        </Field>

        <Button type="submit" className="w-full" loading={submitting} size="lg">
          Sign in
        </Button>
      </form>
    </AuthLayout>
  );
}
