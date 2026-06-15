import { Link } from 'react-router';
import { useAuth } from '@/context/auth';
import { Logo } from '@/components/brand/Logo';
import { Button } from '@/components/ui/Button';
import { IconBuilding, IconLedger, IconShield } from '@/components/ui/icons';

const FEATURES = [
  {
    icon: <IconBuilding />,
    title: 'Properties & listings',
    body: 'Catalogue properties and units, publish listings, and let admins moderate quality before they go live.',
  },
  {
    icon: <IconLedger />,
    title: 'Contracts & an immutable ledger',
    body: 'Issue contracts, auto-generate rent, and track every payment on a tamper-evident financial ledger.',
  },
  {
    icon: <IconShield />,
    title: 'Secure by design',
    body: 'Role-based access, audited admin actions, and Stripe-backed payments — authorization enforced server-side.',
  },
];

export function Landing() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-canvas">
      {/* Nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Logo size={32} />
        <div className="flex items-center gap-2">
          {user ? (
            <Link to="/app">
              <Button>Go to dashboard</Button>
            </Link>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost">Sign in</Button>
              </Link>
              <Link to="/register">
                <Button>Get started</Button>
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pb-20 pt-12 sm:pt-20">
        <div className="mx-auto max-w-3xl text-center animate-rise">
          <span className="inline-flex items-center gap-2 rounded-full border border-ink-200 bg-surface px-3 py-1 text-xs font-medium text-ink-600 shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
            Property management, unified
          </span>
          <h1 className="mt-6 text-4xl font-bold leading-[1.1] tracking-tight text-ink-950 sm:text-6xl">
            Run the entire rental lifecycle in{' '}
            <span className="text-brand-700">one place.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-ink-600">
            Nexus brings listings, tenant relationships, contracts, payments, and operational
            oversight together for landlords, tenants, and administrators.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/register">
              <Button size="lg" className="w-full sm:w-auto">
                Create your account
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                Sign in
              </Button>
            </Link>
          </div>
        </div>

        {/* Feature grid */}
        <div className="mt-24 grid gap-6 sm:grid-cols-3">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className="rounded-2xl border border-ink-200/80 bg-surface p-6 shadow-sm animate-rise"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                {f.icon}
              </div>
              <h3 className="mt-4 font-semibold text-ink-900">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-ink-200">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-sm text-ink-500 sm:flex-row">
          <Logo size={24} />
          <p>© {new Date().getFullYear()} Nexus. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
