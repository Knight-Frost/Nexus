import { Link } from 'react-router';
import { useAuth } from '@/context/auth';
import { useApi } from '@/hooks/useApi';
import { landlordApi } from '@/lib/endpoints';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { IconBuilding, IconDoc, IconHome, IconPlus } from '@/components/ui/icons';
import { humanize, listingStatusTone } from '@/lib/format';

export function LandlordDashboard() {
  const { user } = useAuth();
  const firstName = user && 'first_name' in user ? user.first_name : 'there';

  const properties = useApi(() => landlordApi.properties(), []);
  const listings = useApi(() => landlordApi.listings(), []);
  const contracts = useApi(() => landlordApi.contracts(), []);

  const activeListings = listings.data?.filter((l) => l.status === 'active').length ?? 0;
  const activeContracts = contracts.data?.filter((c) => c.status === 'active').length ?? 0;
  const pendingListings = listings.data?.filter((l) => l.status === 'pending_review').length ?? 0;

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${firstName}`}
        description="Manage your properties, listings, and tenant agreements."
        actions={
          <Link to="/app/properties">
            <Button leftIcon={<IconPlus className="h-4 w-4" />}>Add property</Button>
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Properties"
          value={properties.data?.length ?? 0}
          icon={<IconBuilding className="h-[18px] w-[18px]" />}
          loading={properties.loading}
        />
        <StatCard
          label="Active listings"
          value={activeListings}
          tone="success"
          icon={<IconHome className="h-[18px] w-[18px]" />}
          loading={listings.loading}
        />
        <StatCard
          label="Pending review"
          value={pendingListings}
          tone="warning"
          icon={<IconHome className="h-[18px] w-[18px]" />}
          loading={listings.loading}
        />
        <StatCard
          label="Active contracts"
          value={activeContracts}
          icon={<IconDoc className="h-[18px] w-[18px]" />}
          loading={contracts.loading}
        />
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader
            title="Recent listings"
            action={
              <Link to="/app/listings">
                <Button variant="ghost" size="sm">
                  Manage listings
                </Button>
              </Link>
            }
          />
          <CardBody className="pt-2">
            {listings.loading ? (
              <LoadingState />
            ) : listings.error ? (
              <ErrorState message={listings.error.message} onRetry={listings.reload} />
            ) : !listings.data?.length ? (
              <EmptyState
                icon={<IconHome />}
                title="No listings yet"
                description="Create a property and unit, then publish your first listing."
                action={
                  <Link to="/app/properties">
                    <Button>Get started</Button>
                  </Link>
                }
              />
            ) : (
              <ul className="divide-y divide-ink-100">
                {listings.data.slice(0, 5).map((l) => (
                  <li key={l.id} className="flex items-center justify-between gap-4 py-3">
                    <p className="line-clamp-1 font-medium text-ink-900">{l.title}</p>
                    <Badge tone={listingStatusTone(l.status)}>{humanize(l.status)}</Badge>
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
