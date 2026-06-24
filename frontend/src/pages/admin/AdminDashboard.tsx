import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/context/auth';
import { adminApi } from '@/lib/endpoints';
import { formatCents } from '@/lib/format';
import { PageHeader } from '@/components/layout/PageHeader';
import { ErrorState, ForbiddenState } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import {
  IconUsers,
  IconShield,
  IconFileText,
  IconWallet,
  IconCalendar,
  IconAlertTriangle,
  IconAlertCircle,
  IconActivity,
} from '@/components/ui/icons';
import {
  CommandCard,
  StatusCard,
  DashboardSection,
  SectionHeader,
  DataCardGrid,
  getAdminCriticalVariant,
  getFailedSigninsVariant,
  getPolicyChangesVariant,
  getUserActivityVariant,
  getReviewQueueVariant,
  getLedgerHealthVariant,
} from '@/components/cards';
import type { AdminDashboard as AdminDashboardData, AuditSummary, Listing } from '@/lib/types';
import hero1 from '@/assets/dashboard/home-2.jpg';
import hero2 from '@/assets/dashboard/home-6.jpg';
import hero3 from '@/assets/dashboard/home-3.jpg';
import hero4 from '@/assets/dashboard/home-7.jpg';

import { ReviewQueuePanel } from './components/ReviewQueuePanel';
import { ContractLifecycle } from './components/ContractLifecycle';
import { LedgerHealth } from './components/LedgerHealth';
import { PlatformInventory } from './components/PlatformInventory';
import { AuditTimeline } from './components/AuditTimeline';
import './admin-dashboard.css';

/* Decorative hero photography — cross-faded over time. */
const HERO_SLIDES = [hero1, hero2, hero3, hero4];

/* Re-renders once a minute so the greeting + clock stay honest. */
function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

/* Live status line — surfaces the single most pressing real platform item,
   falling back to the standing overview copy. Never invented. */
function heroSubtitle(d: AdminDashboardData | null | undefined): string {
  if (!d) return 'Here’s your platform overview. Monitor platform health, review listings, and keep the marketplace safe and trustworthy.';
  const n = (c: number, one: string, many: string) => `${c} ${c === 1 ? one : many}`;
  if (d.statistics.pending_listings > 0) {
    return `${n(d.statistics.pending_listings, 'listing is', 'listings are')} awaiting review — keep the marketplace moving.`;
  }
  if (d.ledger.overdue_cents > 0) {
    return `${formatCents(d.ledger.overdue_cents)} in rent is overdue across the platform.`;
  }
  if (d.contracts.pending_tenant > 0) {
    return `${n(d.contracts.pending_tenant, 'contract is', 'contracts are')} awaiting a tenant signature.`;
  }
  return 'Here’s your platform overview. Monitor platform health, review listings, and keep the marketplace safe and trustworthy.';
}

function AdminHero({ name, data }: { name: string; data: AdminDashboardData | null | undefined }) {
  const now = useNow();
  const [slide, setSlide] = useState(0);

  // Cross-fade the decorative photography (respects reduced-motion).
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => setSlide((p) => (p + 1) % HERO_SLIDES.length), 7000);
    return () => clearInterval(id);
  }, []);

  const hour = now.getHours();
  const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
  const dateLabel = now.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const timeLabel = now.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true });

  return (
    <header className="adm-hero">
      <div className="adm-hero-stage" aria-hidden="true">
        {HERO_SLIDES.map((src, i) => (
          <div
            key={src}
            className={`adm-hero-photo${i === slide ? ' on' : ''}`}
            style={{ backgroundImage: `url(${src})` }}
          />
        ))}
        <div className="adm-hero-wash" />
      </div>
      <div className="adm-hero-body">
        <span className="adm-hero-eyebrow">Good {timeOfDay}</span>
        <h1 className="adm-hero-greet">{name}</h1>
        <p className="adm-hero-sub">{heroSubtitle(data)}</p>
        <span className="adm-hero-meta">
          <IconCalendar size={15} />
          {dateLabel} · {timeLabel}
        </span>
      </div>
    </header>
  );
}

/* ── Audit summary KPI row ────────────────────────────────────────────────────
   Five metrics from adminApi.auditSummary(). Variant functions drive color —
   no ad-hoc conditionals. Trends are only rendered when backend provides them.
   needs_review has no trend field per the AuditSummary type. */
function AuditKpiRow({
  summary,
  loading,
  onViewAudit,
}: {
  summary: AuditSummary | null | undefined;
  loading: boolean;
  onViewAudit: () => void;
}) {
  const m = summary?.metrics;

  /* Critical today → CommandCard (danger when >0, success otherwise) */
  const criticalRole = getAdminCriticalVariant(m?.critical_today.value ?? 0);
  /* Failed sign-ins → StatusCard (warning below threshold, danger at/above) */
  const failedRole = getFailedSigninsVariant(m?.failed_signins.value ?? 0);
  /* Policy changes → StatusCard (clay/warning when present, neutral otherwise) */
  const policyRole = getPolicyChangesVariant(m?.policy_changes.value ?? 0);
  /* User activity → StatusCard (success/teal — healthy activity is never danger) */
  const activityRole = getUserActivityVariant(m?.user_activity.value ?? 0);
  /* Needs review → CommandCard (clay/warning when >0, neutral when queue is clear) */
  const reviewRole = getReviewQueueVariant(m?.needs_review.value ?? 0);

  /**
   * Convert a backend AuditTrend into a StatusCard TrendInfo.
   * Returns undefined when the backend did not send a trend (so the chip is
   * not rendered — no fabricated trend data).
   * upIsBad is passed per-metric at call sites for correct color semantics:
   *   failed_signins going UP = bad (red chip), policy_changes UP = neutral watch.
   */
  function auditTrend(
    metric: { trend?: { direction: string; pct: number | null; label: string } } | undefined,
    upIsBad = false,
  ) {
    if (!metric?.trend) return undefined;
    const { direction, label } = metric.trend;
    return {
      direction: (direction === 'up' ? 'up' : direction === 'down' ? 'down' : 'neutral') as 'up' | 'down' | 'neutral',
      value: label,
      upIsBad,
    };
  }

  return (
    <DashboardSection>
      <SectionHeader
        eyebrow="Security & Audit"
        title="Platform health"
        description="Live metrics from the immutable audit log — updated on each page load."
        action={
          <button
            type="button"
            className="text-sm font-medium text-brand-700 hover:text-brand-900 transition-colors"
            onClick={onViewAudit}
          >
            View full audit log →
          </button>
        }
      />

      <DataCardGrid cols={5}>
        {/* 1. Critical today — Level 3 Command card */}
        <CommandCard
          label="Critical today"
          value={loading ? '—' : String(m?.critical_today.value ?? 0)}
          sub={
            loading
              ? undefined
              : criticalRole === 'success'
              ? 'No critical events'
              : `${m?.critical_today.value} critical ${m?.critical_today.value === 1 ? 'event' : 'events'}`
          }
          icon={<IconAlertCircle size={18} />}
          role={criticalRole}
          loading={loading}
        />

        {/* 2. Failed sign-ins — Level 2 StatusCard */}
        <StatusCard
          label="Failed sign-ins"
          value={loading ? '—' : String(m?.failed_signins.value ?? 0)}
          sub={loading ? undefined : m?.failed_signins.label}
          icon={<IconShield size={16} />}
          role={failedRole}
          trend={auditTrend(m?.failed_signins, /* upIsBad */ true)}
          loading={loading}
        />

        {/* 3. Policy changes — Level 2 StatusCard (clay) */}
        <StatusCard
          label="Policy changes"
          value={loading ? '—' : String(m?.policy_changes.value ?? 0)}
          sub={loading ? undefined : m?.policy_changes.label}
          icon={<IconFileText size={16} />}
          role={policyRole}
          trend={auditTrend(m?.policy_changes, /* upIsBad */ true)}
          loading={loading}
        />

        {/* 4. User activity — Level 2 StatusCard (estate green / teal — never danger) */}
        <StatusCard
          label="User activity"
          value={loading ? '—' : String(m?.user_activity.value ?? 0)}
          sub={loading ? undefined : m?.user_activity.label}
          icon={<IconActivity size={16} />}
          role={activityRole}
          trend={auditTrend(m?.user_activity, /* upIsBad */ false)}
          loading={loading}
        />

        {/* 5. Needs review — Level 3 Command card (clay when items present) */}
        <CommandCard
          label="Needs review"
          value={loading ? '—' : String(m?.needs_review.value ?? 0)}
          sub={
            loading
              ? undefined
              : reviewRole === 'neutral'
              ? 'Nothing pending review'
              : `${m?.needs_review.value} ${m?.needs_review.value === 1 ? 'item' : 'items'} pending`
          }
          icon={<IconAlertTriangle size={18} />}
          role={reviewRole}
          loading={loading}
          /* needs_review has no trend — omitted intentionally. */
        />
      </DataCardGrid>
    </DashboardSection>
  );
}

/* ── Headline KPI row ────────────────────────────────────────────────────────
   Four platform-wide headline stats. Outstanding ledger is a CommandCard (most
   important single figure in admin context); the others are StatusCards. */
function HeadlineKpis({
  data,
  loading,
  onNavigateQueue,
  onNavigateUsers,
}: {
  data: AdminDashboardData | null | undefined;
  loading: boolean;
  onNavigateQueue: () => void;
  onNavigateUsers: () => void;
}) {
  const stats = data?.statistics;
  const usersTotal = stats ? stats.landlords + stats.tenants : 0;
  const ledgerRole = data
    ? getLedgerHealthVariant(data.ledger.outstanding_cents, data.ledger.overdue_cents)
    : 'neutral';

  return (
    <DashboardSection>
      <SectionHeader eyebrow="Platform overview" title="At a glance" />
      <DataCardGrid cols={4}>
        {/* 1. Users */}
        <StatusCard
          label="Users"
          value={loading ? '—' : String(usersTotal)}
          sub={
            stats
              ? `${stats.landlords} landlords · ${stats.tenants} tenants`
              : undefined
          }
          icon={<IconUsers size={16} />}
          role="info"
          loading={loading}
          onClick={onNavigateUsers}
        />

        {/* 2. Review queue — StatusCard, navigates to moderation */}
        <StatusCard
          label="Review queue"
          value={loading ? '—' : String(stats?.pending_listings ?? 0)}
          sub="pending listings"
          icon={<IconShield size={16} />}
          role={getReviewQueueVariant(stats?.pending_listings ?? 0)}
          loading={loading}
          onClick={onNavigateQueue}
        />

        {/* 3. Active contracts */}
        <StatusCard
          label="Active contracts"
          value={loading ? '—' : String(stats?.active_contracts ?? 0)}
          sub={
            data
              ? `${data.contracts.pending_tenant} awaiting tenant`
              : undefined
          }
          icon={<IconFileText size={16} />}
          role="success"
          loading={loading}
        />

        {/* 4. Outstanding ledger — CommandCard (most important platform figure) */}
        <CommandCard
          label="Outstanding ledger"
          value={data ? formatCents(data.ledger.outstanding_cents) : '—'}
          sub={
            data
              ? data.ledger.overdue_cents > 0
                ? `${formatCents(data.ledger.overdue_cents)} overdue`
                : 'No overdue entries'
              : undefined
          }
          icon={<IconWallet size={18} />}
          role={ledgerRole}
          loading={loading}
        />
      </DataCardGrid>
    </DashboardSection>
  );
}

/* ── Truthfulness guard: "No overdue entries" is only shown when backend
   confirms overdue_cents === 0 (not on loading). Outstanding/overdue values
   are never invented — they come directly from data.ledger.*. ──────────────── */

export function AdminDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const adminName = user && user.role === 'admin' ? user.name : 'Administrator';

  const dashboardReq = useApi(() => adminApi.dashboard(), []);
  const pendingReq   = useApi(() => adminApi.pendingListings(), []);
  const auditReq     = useApi(() => adminApi.auditLogs({ page: 1 }), []);
  const summaryReq   = useApi(() => adminApi.auditSummary(), []);

  const [busyId, setBusyId] = useState<number | null>(null);

  async function handleApprove(listing: Listing) {
    setBusyId(listing.id);
    try {
      await adminApi.approveListing(listing.id);
      toast(`Approved "${listing.title}"`, 'success');
      pendingReq.reload();
      dashboardReq.reload();
    } catch {
      toast('Could not approve listing. Please retry.', 'error');
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(listing: Listing, reason: string) {
    try {
      await adminApi.rejectListing(listing.id, reason);
      toast(`Rejected "${listing.title}"`, 'success');
      pendingReq.reload();
      dashboardReq.reload();
    } catch {
      toast('Could not reject listing. Please retry.', 'error');
      throw new Error('reject failed');
    }
  }

  // A 403 on the primary endpoint means this account isn't an admin.
  if (dashboardReq.error?.status === 403) {
    return (
      <div className="animate-rise">
        <PageHeader eyebrow="Platform" title="Command center" />
        <ForbiddenState
          title="Admin access required"
          message="This area is restricted to platform administrators."
        />
      </div>
    );
  }

  if (dashboardReq.error) {
    return (
      <div className="animate-rise">
        <PageHeader eyebrow="Platform" title="Command center" />
        <ErrorState message={dashboardReq.error.message} onRetry={dashboardReq.reload} />
      </div>
    );
  }

  const data = dashboardReq.data;
  const loading = dashboardReq.loading;

  return (
    <div className="animate-rise space-y-10">
      {/* Hero masthead */}
      <AdminHero name={adminName} data={data} />

      {/* Headline KPIs — users / review queue / contracts / outstanding */}
      <HeadlineKpis
        data={data}
        loading={loading}
        onNavigateQueue={() => navigate('/app/moderation')}
        onNavigateUsers={() => navigate('/app/admin/users')}
      />

      {/* Security & Audit KPI row — audit summary metrics */}
      <AuditKpiRow
        summary={summaryReq.data}
        loading={summaryReq.loading}
        onViewAudit={() => navigate('/app/audit')}
      />

      {/* Main two-column grid */}
      <div className="grid grid-cols-1 gap-10 xl:grid-cols-[1fr_360px]">
        {/* Left column */}
        <div className="space-y-10">
          <ReviewQueuePanel
            listings={pendingReq.data ?? []}
            loading={pendingReq.loading}
            busyId={busyId}
            onApprove={handleApprove}
            onReject={handleReject}
            onOpenQueue={() => navigate('/app/moderation')}
          />

          {data && <LedgerHealth ledger={data.ledger} />}

          {data && <ContractLifecycle contracts={data.contracts} />}
        </div>

        {/* Right column */}
        <div className="space-y-10">
          <AuditTimeline
            logs={auditReq.data?.data ?? []}
            loading={auditReq.loading}
            max={6}
            onFullLog={() => navigate('/app/audit')}
          />

          {data && (
            <PlatformInventory
              listingsByStatus={data.listings_by_status}
              properties={data.statistics.properties}
              units={data.statistics.units}
              totalListings={data.statistics.total_listings}
            />
          )}
        </div>
      </div>
    </div>
  );
}

