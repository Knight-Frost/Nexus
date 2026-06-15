import { Link } from 'react-router';
import { useApi } from '@/hooks/useApi';
import { adminApi } from '@/lib/endpoints';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { IconDoc, IconLedger, IconShield } from '@/components/ui/icons';
import { formatDateTime } from '@/lib/format';

export function AdminDashboard() {
  const pending = useApi(() => adminApi.pendingListings(), []);
  const contracts = useApi(() => adminApi.contracts(), []);
  const audit = useApi(() => adminApi.auditLogs(), []);

  const severityTone = (s: string) =>
    s === 'critical' ? 'danger' : s === 'warning' ? 'warning' : 'info';

  return (
    <div>
      <PageHeader
        title="Platform overview"
        description="Moderate listings, monitor contracts, and review the audit trail."
        actions={
          <Link to="/app/moderation">
            <Button leftIcon={<IconShield className="h-4 w-4" />}>Review queue</Button>
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Listings pending review"
          value={pending.data?.length ?? 0}
          tone="warning"
          icon={<IconShield className="h-[18px] w-[18px]" />}
          loading={pending.loading}
        />
        <StatCard
          label="Total contracts"
          value={contracts.data?.total ?? 0}
          icon={<IconDoc className="h-[18px] w-[18px]" />}
          loading={contracts.loading}
        />
        <StatCard
          label="Audit events"
          value={audit.data?.total ?? 0}
          tone="neutral"
          icon={<IconLedger className="h-[18px] w-[18px]" />}
          loading={audit.loading}
        />
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader
            title="Recent activity"
            description="Latest entries from the immutable audit log."
            action={
              <Link to="/app/audit">
                <Button variant="ghost" size="sm">
                  View all
                </Button>
              </Link>
            }
          />
          <CardBody className="pt-2">
            {audit.loading ? (
              <LoadingState />
            ) : audit.error ? (
              <ErrorState message={audit.error.message} onRetry={audit.reload} />
            ) : !audit.data?.data.length ? (
              <EmptyState icon={<IconLedger />} title="No activity yet" />
            ) : (
              <ul className="divide-y divide-ink-100">
                {audit.data.data.slice(0, 6).map((log) => (
                  <li key={log.id} className="flex items-center justify-between gap-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink-900">
                        {log.description ?? log.action}
                      </p>
                      <p className="text-xs text-ink-500">{formatDateTime(log.created_at)}</p>
                    </div>
                    <Badge tone={severityTone(log.severity)}>{log.severity}</Badge>
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
