import { Link } from 'react-router';
import { useAuth } from '@/context/auth';
import { useApi } from '@/hooks/useApi';
import { tenantApi } from '@/lib/endpoints';
import { formatCents } from '@/lib/format';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { IconDoc, IconHeart, IconLedger, IconSearch } from '@/components/ui/icons';
import { contractStatusTone, humanize } from '@/lib/format';

export function TenantDashboard() {
  const { user } = useAuth();
  const firstName = user && 'first_name' in user ? user.first_name : 'there';

  const balance = useApi(() => tenantApi.balance(), []);
  const contracts = useApi(() => tenantApi.contracts(), []);
  const saved = useApi(() => tenantApi.savedListings(), []);

  const activeContracts = contracts.data?.filter((c) => c.status === 'active').length ?? 0;
  const balanceCents = balance.data?.balance_cents ?? 0;

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${firstName}`}
        description="Here’s a snapshot of your rentals and payments."
        actions={
          <Link to="/app/browse">
            <Button leftIcon={<IconSearch className="h-4 w-4" />}>Browse listings</Button>
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Outstanding balance"
          value={formatCents(balanceCents)}
          tone={balanceCents > 0 ? 'warning' : 'success'}
          icon={<IconLedger className="h-[18px] w-[18px]" />}
          hint={balanceCents > 0 ? 'Due across your obligations' : 'You’re all paid up'}
          loading={balance.loading}
        />
        <StatCard
          label="Active contracts"
          value={activeContracts}
          icon={<IconDoc className="h-[18px] w-[18px]" />}
          loading={contracts.loading}
        />
        <StatCard
          label="Saved listings"
          value={saved.data?.length ?? 0}
          tone="neutral"
          icon={<IconHeart className="h-[18px] w-[18px]" />}
          loading={saved.loading}
        />
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader
            title="Your contracts"
            description="Agreements you’ve received or signed."
            action={
              <Link to="/app/contracts">
                <Button variant="ghost" size="sm">
                  View all
                </Button>
              </Link>
            }
          />
          <CardBody className="pt-2">
            {contracts.loading ? (
              <LoadingState />
            ) : contracts.error ? (
              <ErrorState message={contracts.error.message} onRetry={contracts.reload} />
            ) : !contracts.data?.length ? (
              <EmptyState
                icon={<IconDoc />}
                title="No contracts yet"
                description="When a landlord sends you a contract, it’ll appear here for review."
              />
            ) : (
              <ul className="divide-y divide-ink-100">
                {contracts.data.slice(0, 4).map((c) => (
                  <li key={c.id}>
                    <Link
                      to={`/app/contracts/${c.id}`}
                      className="flex items-center justify-between gap-4 py-3 transition hover:opacity-80"
                    >
                      <div>
                        <p className="font-medium text-ink-900">{formatCents(c.rent_amount)}/mo</p>
                        <p className="text-sm text-ink-500">
                          {c.start_date} → {c.end_date}
                        </p>
                      </div>
                      <Badge tone={contractStatusTone(c.status)}>{humanize(c.status)}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
