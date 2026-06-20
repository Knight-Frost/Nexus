import { useNavigate } from 'react-router';
import { useApi } from '@/hooks/useApi';
import { adminApi } from '@/lib/endpoints';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { IconShield, IconUsers, IconLedger, IconAlertTriangle } from '@/components/ui/icons';

import { MOCK_ADMIN_DASHBOARD, MOD_QUEUE } from './adminMockData';
import { ModerationCommandCenter } from './components/ModerationCommandCenter';
import { AuditTimeline } from './components/AuditTimeline';
import { LedgerSnapshot } from './components/LedgerSnapshot';
import { ContractLifecycle } from './components/ContractLifecycle';
import { SystemAlertsCard } from './components/SystemAlertsCard';
import {
  AUDIT_EVENTS,
  LEDGER_BARS,
  LEDGER_BAR_LABELS,
  LEDGER_STATS,
  CONTRACT_STAGES,
  CONTRACT_TOTAL,
} from './adminMockData';

const ICON_SIZE = { size: 18 as const };

export function AdminDashboard() {
  const navigate = useNavigate();
  const dashboardReq = useApi(() => adminApi.dashboard(), []);
  const pendingReq = useApi(() => adminApi.pendingListings(), []);

  // Prefer live data; fall back to mock
  const mock = MOCK_ADMIN_DASHBOARD;
  const pendingCount = pendingReq.data?.length ?? mock.review_queue_count;
  const disputes = mock.open_disputes_count;

  function handleApprove(id: number) {
    void adminApi.approveListing(id).then(() => pendingReq.reload?.());
  }

  function handleReject(id: number, _reason: string) {
    void adminApi.rejectListing(id, _reason).then(() => pendingReq.reload?.());
  }

  // Build listing objects compatible with ModerationCommandCenter from mock queue
  // (real data comes via pendingReq; keep mock for dashboard preview — first 4 rows)
  const queueListings = pendingReq.data?.slice(0, 4) ?? null;

  return (
    <div className="animate-rise space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="Platform Overview"
        description="Moderate listings, verify users, review the ledger, and monitor the audit trail."
        action={
          <Button
            leftIcon={<IconShield {...ICON_SIZE} />}
            onClick={() => navigate('/app/moderation')}
          >
            Review queue
          </Button>
        }
      />

      {/* Stats row */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Review Queue"
          value={pendingCount}
          subtext="pending listings"
          tone="warning"
          loading={pendingReq.loading}
          icon={<IconShield {...ICON_SIZE} />}
        />
        <StatCard
          label="Verification Queue"
          value={mock.verification_queue_count}
          subtext="users awaiting identity check"
          tone="info"
          icon={<IconUsers {...ICON_SIZE} />}
        />
        <StatCard
          label="Ledger Volume (7 days)"
          value="GH₵248,000"
          subtext="vs prior week +12%"
          tone="money"
          loading={dashboardReq.loading}
          icon={<IconLedger {...ICON_SIZE} />}
        />
        <StatCard
          label="Open Disputes"
          value={disputes}
          subtext={disputes > 0 ? 'requires attention' : 'no open disputes'}
          tone={disputes > 0 ? 'danger' : 'success'}
          icon={<IconAlertTriangle {...ICON_SIZE} />}
        />
      </div>

      {/* Main 2-col layout */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_360px]">
        {/* Left column */}
        <div className="space-y-5">
          {/* Listing Review Queue */}
          <Card>
            <CardHeader
              title="Listing Review Queue"
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate('/app/moderation')}
                >
                  Open queue
                  {pendingCount > 0 && (
                    <Badge tone="warning" dot={false} className="ml-2">
                      {pendingCount}
                    </Badge>
                  )}
                </Button>
              }
            />
            <CardBody className="p-0">
              {queueListings ? (
                <ModerationCommandCenter
                  listings={queueListings}
                  onApprove={handleApprove}
                  onReject={handleReject}
                />
              ) : (
                <ModerationCommandCenter
                  listings={null}
                  mockQueue={MOD_QUEUE.slice(0, 4)}
                  onApprove={handleApprove}
                  onReject={handleReject}
                />
              )}
            </CardBody>
          </Card>

          {/* Ledger Health */}
          <LedgerSnapshot
            bars={LEDGER_BARS}
            labels={LEDGER_BAR_LABELS}
            stats={LEDGER_STATS}
          />
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* System Alerts */}
          <SystemAlertsCard alerts={mock.platform_alerts} />

          {/* Audit Activity */}
          <Card>
            <CardHeader
              title="Audit Activity"
              action={
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/app/audit')}
                >
                  Full log
                </Button>
              }
            />
            <CardBody className="p-0">
              <AuditTimeline events={AUDIT_EVENTS} max={5} compact />
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Bottom row: contract lifecycle */}
      <ContractLifecycle stages={CONTRACT_STAGES} total={CONTRACT_TOTAL} />
    </div>
  );
}
