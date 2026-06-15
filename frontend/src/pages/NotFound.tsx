import { Link } from 'react-router';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/brand/Logo';

export function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <Logo size={36} />
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">404</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink-950">Page not found</h1>
        <p className="mt-2 max-w-sm text-ink-500">
          The page you’re looking for doesn’t exist or may have moved.
        </p>
      </div>
      <div className="flex gap-3">
        <Link to="/app">
          <Button>Back to dashboard</Button>
        </Link>
        <Link to="/">
          <Button variant="secondary">Go home</Button>
        </Link>
      </div>
    </div>
  );
}
