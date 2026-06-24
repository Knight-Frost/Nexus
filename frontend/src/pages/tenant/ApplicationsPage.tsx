import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router';
import { useApi } from '@/hooks/useApi';
import { tenantApi } from '@/lib/endpoints';
import { formatDate, formatCedisDecimal } from '@/lib/format';
import { useToast } from '@/components/ui/toast';
import {
  LoadingState,
  ErrorState,
  ForbiddenState,
  EmptyState,
} from '@/components/ui/states';
import {
  StatusCard,
  SemanticBadge,
  DashboardSection,
  DataCardGrid,
  NexusCard,
  getApplicationVariant,
} from '@/components/cards';
import {
  IconFileText,
  IconCheckCircle,
  IconClock,
  IconXCircle,
  IconSearch,
  IconMapPin,
  IconBed,
  IconBath,
  IconCheck,
  IconChevronRight,
  IconArrowRight,
  IconUsers,
  IconActivity,
} from '@/components/ui/icons';
import type { Application, ApplicationStatus } from '@/lib/types';
import './applications.css';

/* ---- Status helpers ------------------------------------------------------- */

const IN_PROGRESS_STATUSES: ApplicationStatus[] = [
  'submitted',
  'in_review',
  'landlord_review',
];

const ACTIVE_STATUSES: ApplicationStatus[] = [
  'submitted',
  'in_review',
  'landlord_review',
];

function isActive(status: ApplicationStatus): boolean {
  return (ACTIVE_STATUSES as string[]).includes(status);
}

/* ---- Stepper stages ------------------------------------------------------- */

const STAGES = ['Submitted', 'In review', 'Landlord', 'Decision'];

type StepStatus = {
  step: number;
  accent: 'brand' | 'success' | 'danger' | 'ink';
};

function getStepStatus(status: ApplicationStatus): StepStatus {
  switch (status) {
    case 'submitted':       return { step: 0, accent: 'brand' };
    case 'in_review':       return { step: 1, accent: 'brand' };
    case 'landlord_review': return { step: 2, accent: 'brand' };
    case 'approved':        return { step: 3, accent: 'success' };
    case 'rejected':        return { step: 3, accent: 'danger' };
    default:                return { step: 0, accent: 'ink' };
  }
}

/* ── Stepper ──────────────────────────────────────────────────────────────── */

function Stepper({ step, accent }: { step: number; accent: StepStatus['accent'] }) {
  const accentVar =
    accent === 'success' ? 'var(--color-success-600)'
    : accent === 'danger'  ? 'var(--color-danger-600)'
    : accent === 'ink'     ? 'var(--color-ink-400)'
    :                        'var(--color-brand-600)';

  return (
    <div className="ap2-steps" aria-label="Application progress">
      {STAGES.map((s, i) => {
        const done    = i < step;
        const current = i === step;
        return (
          <div
            key={s}
            className={`ap2-step${done ? ' done' : ''}${current ? ' current' : ''}`}
            style={{ '--ap2-accent': accentVar } as React.CSSProperties}
            aria-current={current ? 'step' : undefined}
          >
            <span className="ap2-step-node" aria-hidden="true">
              {done ? (
                <IconCheck size={13} strokeWidth={2.5} />
              ) : current ? (
                <span className="ap2-step-dot" />
              ) : null}
            </span>
            <span className="ap2-step-label">{s}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ── Application card ────────────────────────────────────────────────────── */

function ApplicationCard({
  app,
  onWithdraw,
  withdrawingId,
}: {
  app: Application;
  onWithdraw: (id: number) => void;
  withdrawingId: number | null;
}) {
  const navigate  = useNavigate();
  const role      = getApplicationVariant(app.status);
  const { step, accent } = getStepStatus(app.status);

  const listing  = app.listing;
  const unit     = listing?.unit;
  const property = unit?.property;

  const title      = listing?.title ?? `Application #${app.id}`;
  const city       = property?.city ?? null;
  const bedrooms   = unit?.bedrooms ?? null;
  const bathrooms  = unit?.bathrooms ?? null;
  const rentAmount = unit?.rent_amount ?? null;

  const canWithdraw  = isActive(app.status);
  const isWithdrawing = withdrawingId === app.id;

  return (
    <article className="ap2-card">
      {/* ── Property info ── */}
      <div className="ap2-card-info">
        <h3 className="ap2-card-name">{title}</h3>
        {city && (
          <p className="ap2-card-location">
            <IconMapPin size={13} aria-hidden="true" />
            {city}
          </p>
        )}
        <div className="ap2-card-specs">
          {bedrooms !== null && (
            <span className="ap2-card-spec">
              <IconBed size={14} aria-hidden="true" />
              {bedrooms} bd
            </span>
          )}
          {bathrooms !== null && (
            <span className="ap2-card-spec">
              <IconBath size={14} aria-hidden="true" />
              {bathrooms} ba
            </span>
          )}
          {rentAmount && (
            <span className="ap2-card-spec ap2-card-money">
              {formatCedisDecimal(rentAmount)}/mo
            </span>
          )}
        </div>
      </div>

      {/* ── Status column ── */}
      <div className="ap2-card-status">
        <SemanticBadge role={role} status={app.status} size="sm" />
        <div className="ap2-meta">
          <span className="ap2-meta-lab">Applied</span>
          <span className="ap2-meta-val">
            {formatDate(app.submitted_at ?? app.created_at)}
          </span>
        </div>
        {(app.reviewed_at ?? app.decided_at) && (
          <div className="ap2-meta">
            <span className="ap2-meta-lab">Last updated</span>
            <span className="ap2-meta-val">
              {formatDate(app.decided_at ?? app.reviewed_at)}
            </span>
          </div>
        )}
        {app.decision_reason &&
          (app.status === 'approved' || app.status === 'rejected') && (
            <div className="ap2-meta">
              <span className="ap2-meta-lab">Decision note</span>
              <span className="ap2-meta-reason">{app.decision_reason}</span>
            </div>
          )}
      </div>

      {/* ── Progress track ── */}
      <div className="ap2-card-track">
        <Stepper step={step} accent={accent} />
        <div className="ap2-actions">
          <button
            className="ap2-btn-ghost"
            onClick={() => navigate('/app/contracts')}
            type="button"
          >
            <IconActivity size={14} aria-hidden="true" />
            Timeline
          </button>
          <button
            className="ap2-btn-ghost"
            onClick={() => navigate('/app/messages')}
            type="button"
          >
            <IconUsers size={14} aria-hidden="true" />
            Message
          </button>
          {canWithdraw && (
            <button
              className="ap2-btn-ghost ap2-btn-withdraw"
              onClick={() => onWithdraw(app.id)}
              disabled={isWithdrawing}
              type="button"
            >
              {isWithdrawing ? 'Withdrawing…' : 'Withdraw'}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

/* ── Filter tabs ─────────────────────────────────────────────────────────── */

const TABS = [
  { v: 'all',       l: 'All' },
  { v: 'in_review', l: 'In review' },
  { v: 'approved',  l: 'Approved' },
  { v: 'submitted', l: 'Submitted' },
  { v: 'rejected',  l: 'Rejected' },
];

function matchesTab(a: Application, tab: string): boolean {
  switch (tab) {
    case 'in_review': return (IN_PROGRESS_STATUSES as string[]).includes(a.status);
    case 'approved':  return a.status === 'approved';
    case 'submitted': return a.status === 'submitted';
    case 'rejected':  return a.status === 'rejected';
    default:          return true;
  }
}

/* ============================================================================
   ApplicationsPage
   ============================================================================ */

export function ApplicationsPage() {
  const [tab, setTab]         = useState('all');
  const [query, setQuery]     = useState('');
  const [withdrawingId, setWithdrawingId] = useState<number | null>(null);

  const appsQ   = useApi(() => tenantApi.applications(), []);
  const { toast } = useToast();

  const apps = useMemo(() => appsQ.data ?? [], [appsQ.data]);

  /* Derived counts — all from real data */
  const { total, approved, inProgress, rejected, activeCount } = useMemo(() => {
    const total      = apps.length;
    const approved   = apps.filter((a) => a.status === 'approved').length;
    const inProgress = apps.filter((a) =>
      (IN_PROGRESS_STATUSES as string[]).includes(a.status),
    ).length;
    const rejected   = apps.filter((a) => a.status === 'rejected').length;
    const activeCount = apps.filter((a) => isActive(a.status)).length;
    return { total, approved, inProgress, rejected, activeCount };
  }, [apps]);

  const q    = query.trim().toLowerCase();
  const list = useMemo(
    () =>
      apps.filter((a) => {
        if (!matchesTab(a, tab)) return false;
        if (!q) return true;
        const listing = a.listing;
        const title   = listing?.title ?? '';
        const city    = listing?.unit?.property?.city ?? '';
        return `${title} ${city}`.toLowerCase().includes(q);
      }),
    [apps, tab, q],
  );

  async function handleWithdraw(id: number) {
    if (withdrawingId !== null) return;
    setWithdrawingId(id);
    try {
      await tenantApi.withdrawApplication(id);
      toast('Application withdrawn.', 'success');
      appsQ.reload();
    } catch {
      toast('Failed to withdraw the application. Please try again.', 'error');
    } finally {
      setWithdrawingId(null);
    }
  }

  /* ── Loading ─────────────────────────────────────────────────────────── */
  if (appsQ.loading) {
    return (
      <div className="ap2-page">
        <PageHeader query={query} onQueryChange={setQuery} />
        <LoadingState label="Loading applications…" />
      </div>
    );
  }

  /* ── Error ───────────────────────────────────────────────────────────── */
  if (appsQ.error) {
    if (appsQ.error.status === 403) {
      return (
        <div className="ap2-page">
          <PageHeader query={query} onQueryChange={setQuery} />
          <ForbiddenState
            title="Applications unavailable"
            message="Your account doesn't have access to applications."
          />
        </div>
      );
    }
    return (
      <div className="ap2-page">
        <PageHeader query={query} onQueryChange={setQuery} />
        <ErrorState
          title="Couldn't load applications"
          message={appsQ.error.message}
          onRetry={appsQ.reload}
        />
      </div>
    );
  }

  /* ── Zero applications ───────────────────────────────────────────────── */
  if (apps.length === 0) {
    return (
      <div className="ap2-page">
        <PageHeader query={query} onQueryChange={setQuery} />
        <EmptyState
          icon={<IconFileText size={26} />}
          title="No applications yet"
          description="When you apply for a home, your progress will appear here."
          action={
            <Link to="/app/browse" className="ap2-browse-link">
              Browse homes <IconArrowRight size={15} aria-hidden="true" />
            </Link>
          }
        />
      </div>
    );
  }

  /* ── Main render ─────────────────────────────────────────────────────── */
  return (
    <div className="ap2-page">
      <PageHeader query={query} onQueryChange={setQuery} />

      {/* ── Filter tabs ── */}
      <nav className="ap2-tabs" aria-label="Filter applications">
        {TABS.map((t) => (
          <button
            key={t.v}
            className={`ap2-tab${tab === t.v ? ' on' : ''}`}
            onClick={() => setTab(t.v)}
            type="button"
            aria-pressed={tab === t.v}
          >
            {t.l}
          </button>
        ))}
      </nav>

      {/* ── Summary stat cards ── */}
      <DashboardSection eyebrow="Overview" title="Your Applications">
        <DataCardGrid cols={4}>
          <StatusCard
            label="Total applications"
            value={total}
            sub="All time"
            icon={<IconFileText size={18} />}
            role="neutral"
            onClick={() => setTab('all')}
          />
          <StatusCard
            label="Approved"
            value={approved}
            sub={total > 0 ? `${Math.round((approved / total) * 100)}% of total` : 'None yet'}
            icon={<IconCheckCircle size={18} />}
            role={approved > 0 ? 'success' : 'neutral'}
            onClick={() => setTab('approved')}
          />
          <StatusCard
            label="In progress"
            value={inProgress}
            sub={total > 0 ? `${Math.round((inProgress / total) * 100)}% of total` : 'None yet'}
            icon={<IconClock size={18} />}
            role={inProgress > 0 ? 'warning' : 'neutral'}
            onClick={() => setTab('in_review')}
          />
          <StatusCard
            label="Rejected"
            value={rejected}
            sub={total > 0 ? `${Math.round((rejected / total) * 100)}% of total` : 'None yet'}
            icon={<IconXCircle size={18} />}
            role={rejected > 0 ? 'danger' : 'neutral'}
            onClick={() => setTab('rejected')}
          />
        </DataCardGrid>
      </DashboardSection>

      {/* ── Active-applications notice ── */}
      {activeCount > 0 && (
        <NexusCard role="info" className="ap2-active-notice">
          <div className="ap2-active-notice-body">
            <p className="ap2-active-count">
              {activeCount} active application{activeCount === 1 ? '' : 's'}
            </p>
            <p className="ap2-active-sub">
              Track each stage below — you'll be notified when your status changes.
            </p>
          </div>
          <div className="ap2-stages-legend" aria-hidden="true">
            {['Submitted', 'In review', 'Landlord', 'Decision'].map((s, i) => (
              <div key={s} className="ap2-legend-item">
                <span className="ap2-legend-node">{i + 1}</span>
                <span className="ap2-legend-label">{s}</span>
              </div>
            ))}
          </div>
        </NexusCard>
      )}

      {/* ── Application list / filtered-empty ── */}
      {list.length === 0 ? (
        <EmptyState
          icon={<IconFileText size={26} />}
          title="No applications here"
          description="Nothing matches this filter. Try a different tab or clear your search."
          action={
            <Link to="/app/browse" className="ap2-browse-link">
              Browse homes <IconChevronRight size={15} aria-hidden="true" />
            </Link>
          }
        />
      ) : (
        <div className="ap2-list">
          {list.map((a) => (
            <ApplicationCard
              key={a.id}
              app={a}
              onWithdraw={handleWithdraw}
              withdrawingId={withdrawingId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Page header ─────────────────────────────────────────────────────────── */

function PageHeader({
  query,
  onQueryChange,
}: {
  query: string;
  onQueryChange: (v: string) => void;
}) {
  return (
    <div className="ap2-header">
      <div>
        <span className="eyebrow">My Rental</span>
        <h1 className="ap2-title">Applications</h1>
        <p className="ap2-sub">
          Track your rental applications, next steps, and decision status in one
          place.
        </p>
      </div>
      <label className="ap2-search" aria-label="Search applications">
        <IconSearch size={17} aria-hidden="true" />
        <input
          type="search"
          placeholder="Search by property or city…"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
        />
      </label>
    </div>
  );
}
