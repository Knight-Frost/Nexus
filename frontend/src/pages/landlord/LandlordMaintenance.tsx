import { useMemo, useState } from 'react';
import { useApi } from '@/hooks/useApi';
import { landlordApi } from '@/lib/endpoints';
import { formatDate, formatDateTime, timeAgo, humanize } from '@/lib/format';
import { paginate, rangeLabel } from '@/lib/paginate';
import {
  maintenanceStatusLabel,
  maintenanceStatusTone,
  maintenancePriorityLabel,
  maintenanceCategoryLabel,
} from '@/lib/statusMaps';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { RecordList, RecordCard } from '@/components/ui/RecordCard';
import { DetailDrawer } from '@/components/ui/Drawer';
import { Textarea } from '@/components/ui/Field';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import {
  CommandBar,
  SearchInput,
  FilterTabs,
  SortSelect,
  Pagination,
  ActionMenu,
  StatusChip,
  type FilterTab as Tab,
  type SelectOption,
} from '@/components/landlord/primitives';
import {
  IconWrench,
  IconRefresh,
  IconAlertCircle,
  IconClock,
  IconCheckCircle,
  IconZap,
  IconEye,
} from '@/components/ui/icons';
import { useToast } from '@/components/ui/toast';
import type { MaintenanceRequest, MaintenanceStatus, MaintenancePriority } from '@/lib/types';
import {
  StatusCard,
  SemanticBadge,
  IconTile,
  DashboardSection,
  DataCardGrid,
  getMaintenanceVariant,
} from '@/components/cards';

/* ---- Types ---------------------------------------------------------------- */

type FilterKey = 'all' | MaintenanceStatus;
type PriorityFilter = 'all' | MaintenancePriority;
type SortKey = 'newest' | 'oldest' | 'priority';

/* ---- Constants ------------------------------------------------------------ */

const PER_PAGE = 8;

const SORT_OPTIONS: SelectOption<SortKey>[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'priority', label: 'Priority high→low' },
];

const PRIORITY_ORDER: Record<MaintenancePriority, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const PRIORITY_OPTIONS: SelectOption<PriorityFilter>[] = [
  { value: 'all', label: 'All priorities' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

/* ---- Status transition logic (PRESERVED from original) -------------------- */

interface Transition {
  next: MaintenanceStatus;
  label: string;
  requiresNotes?: boolean;
}

function transitionsFor(status: MaintenanceStatus): Transition[] {
  switch (status) {
    case 'open':
      return [{ next: 'acknowledged', label: 'Acknowledge' }];
    case 'acknowledged':
      return [{ next: 'in_progress', label: 'Start work' }];
    case 'in_progress':
      return [{ next: 'resolved', label: 'Mark resolved', requiresNotes: true }];
    case 'resolved':
      return [{ next: 'closed', label: 'Close request' }];
    default:
      return [];
  }
}

/* ---- Category icon map ---------------------------------------------------- */

function CategoryIcon({ category, size = 18 }: { category: MaintenanceRequest['category']; size?: number }) {
  switch (category) {
    case 'electrical':
      return <IconZap size={size} />;
    case 'hvac':
      return <IconZap size={size} />;
    case 'structural':
      return <IconAlertCircle size={size} />;
    case 'plumbing':
    case 'appliance':
    case 'general':
    default:
      return <IconWrench size={size} />;
  }
}

/* ---- Page ----------------------------------------------------------------- */

export function LandlordMaintenance() {
  const { toast } = useToast();
  const { data, loading, error, reload } = useApi(() => landlordApi.maintenance(), []);

  // Filter / search / sort / page state
  const [tab, setTab] = useState<FilterKey>('all');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('newest');
  const [page, setPage] = useState(1);

  // Status-update modal (PRESERVED)
  const [updateTarget, setUpdateTarget] = useState<{ req: MaintenanceRequest; transition: Transition } | null>(null);
  const [resolveNotes, setResolveNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  // Read-only detail modal
  const [detailTarget, setDetailTarget] = useState<MaintenanceRequest | null>(null);

  const requests = useMemo(() => data ?? [], [data]);

  /* ---- KPI counts (real, no deltas) --------------------------------------- */
  const kpi = useMemo(() => {
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      open: requests.filter((r) => r.status === 'open').length,
      inProgress: requests.filter((r) => r.status === 'in_progress').length,
      urgent: requests.filter((r) => r.priority === 'urgent').length,
      resolvedThisMonth: requests.filter(
        (r) =>
          r.status === 'resolved' &&
          r.resolved_at != null &&
          new Date(r.resolved_at) >= thisMonthStart,
      ).length,
    };
  }, [requests]);

  /* ---- Tab counts --------------------------------------------------------- */
  const tabCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of requests) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [requests]);

  const tabs: Tab<FilterKey>[] = [
    { key: 'all', label: 'All', count: requests.length },
    { key: 'open', label: 'Open', count: tabCounts.open ?? 0, tone: maintenanceStatusTone.open },
    { key: 'acknowledged', label: 'Acknowledged', count: tabCounts.acknowledged ?? 0, tone: maintenanceStatusTone.acknowledged },
    { key: 'in_progress', label: 'In progress', count: tabCounts.in_progress ?? 0, tone: maintenanceStatusTone.in_progress },
    { key: 'resolved', label: 'Resolved', count: tabCounts.resolved ?? 0, tone: maintenanceStatusTone.resolved },
    { key: 'closed', label: 'Closed', count: tabCounts.closed ?? 0, tone: maintenanceStatusTone.closed },
    { key: 'cancelled', label: 'Cancelled', count: tabCounts.cancelled ?? 0, tone: maintenanceStatusTone.cancelled },
  ];

  /* ---- Filtered + sorted list --------------------------------------------- */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = tab === 'all' ? requests : requests.filter((r) => r.status === tab);
    if (priorityFilter !== 'all') {
      rows = rows.filter((r) => r.priority === priorityFilter);
    }
    if (q) {
      rows = rows.filter((r) => {
        const hay = [r.title, r.property?.name, r.unit?.unit_number].filter(Boolean).join(' ').toLowerCase();
        return hay.includes(q);
      });
    }
    return [...rows].sort((a, b) => {
      switch (sort) {
        case 'oldest':
          return +new Date(a.submitted_at ?? a.created_at) - +new Date(b.submitted_at ?? b.created_at);
        case 'priority':
          return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
        case 'newest':
        default:
          return +new Date(b.submitted_at ?? b.created_at) - +new Date(a.submitted_at ?? a.created_at);
      }
    });
  }, [requests, tab, priorityFilter, search, sort]);

  const slice = paginate(filtered, page, PER_PAGE);

  /* ---- Status transition handlers (PRESERVED) ----------------------------- */

  async function applyStatus(req: MaintenanceRequest, next: MaintenanceStatus, notes?: string) {
    try {
      await landlordApi.updateMaintenanceStatus(req.id, next, notes);
      toast(`Request marked ${humanize(next).toLowerCase()}.`, 'success');
      reload();
    } catch {
      toast('Could not update the request. Please try again.', 'error');
    }
  }

  function handleTransition(req: MaintenanceRequest, t: Transition) {
    if (t.requiresNotes) {
      setUpdateTarget({ req, transition: t });
      setResolveNotes('');
      return;
    }
    applyStatus(req, t.next);
  }

  async function confirmUpdate() {
    if (!updateTarget) return;
    setUpdating(true);
    try {
      await landlordApi.updateMaintenanceStatus(
        updateTarget.req.id,
        updateTarget.transition.next,
        resolveNotes.trim() || undefined,
      );
      toast(`Request marked ${humanize(updateTarget.transition.next).toLowerCase()}.`, 'success');
      setUpdateTarget(null);
      setResolveNotes('');
      reload();
    } catch {
      toast('Could not update the request. Please try again.', 'error');
    } finally {
      setUpdating(false);
    }
  }

  const hasAny = requests.length > 0;

  return (
    <div className="animate-rise space-y-10">
      <PageHeader
        eyebrow="Operations"
        title="Maintenance"
        description="Triage and resolve maintenance requests across your portfolio."
        action={
          <Button
            variant="secondary"
            leftIcon={<IconRefresh size={16} />}
            onClick={reload}
          >
            Refresh
          </Button>
        }
      />

      {/* KPI row — all real counts, semantic roles from data */}
      <DashboardSection eyebrow="MAINTENANCE OVERVIEW">
        <DataCardGrid cols={4}>
          <StatusCard
            label="Open requests"
            value={kpi.open}
            sub="Require attention"
            role={kpi.open > 0 ? 'danger' : 'neutral'}
            icon={<IconAlertCircle size={18} />}
            loading={loading}
          />
          <StatusCard
            label="In progress"
            value={kpi.inProgress}
            sub="Being worked on"
            role={kpi.inProgress > 0 ? 'info' : 'neutral'}
            icon={<IconClock size={18} />}
            loading={loading}
          />
          <StatusCard
            label="Urgent"
            value={kpi.urgent}
            sub="High priority requests"
            role={kpi.urgent > 0 ? 'danger' : 'neutral'}
            icon={<IconZap size={18} />}
            loading={loading}
          />
          <StatusCard
            label="Resolved this month"
            value={kpi.resolvedThisMonth}
            sub="Completed"
            role={kpi.resolvedThisMonth > 0 ? 'success' : 'neutral'}
            icon={<IconCheckCircle size={18} />}
            loading={loading}
          />
        </DataCardGrid>
      </DashboardSection>

      {/* Command bar */}
      <CommandBar>
        <SearchInput
          value={search}
          onChange={(v) => { setSearch(v); setPage(1); }}
          placeholder="Search by issue title, property or unit…"
          label="Search requests"
        />
        <FilterTabs tabs={tabs} value={tab} onChange={(k) => { setTab(k); setPage(1); }} />
        <SortSelect
          value={priorityFilter}
          onChange={(v) => { setPriorityFilter(v); setPage(1); }}
          options={PRIORITY_OPTIONS}
          label="Filter by priority"
          prefix=""
        />
        <SortSelect value={sort} onChange={setSort} options={SORT_OPTIONS} />
      </CommandBar>

      {/* Main content */}
      {loading ? (
        <LoadingState label="Loading maintenance requests…" />
      ) : error ? (
        <ErrorState message={error.message} onRetry={reload} />
      ) : !hasAny ? (
        <EmptyState
          icon={<IconWrench />}
          title="No maintenance requests"
          description="When a tenant reports an issue, it appears here for triage."
        />
      ) : slice.total === 0 ? (
        <EmptyState
          icon={<IconWrench />}
          title="No requests match"
          description="Try a different status, priority filter, or search term."
        />
      ) : (
        /* Record list — one standalone card per request. No table shell, no
           horizontal scroll: identity + location + priority + status + actions
           stay visible (stacking on mobile, inline columns on desktop). */
        <div className="space-y-5">
          <RecordList>
            {slice.items.map((req) => {
              const transitions = transitionsFor(req.status);
              const location =
                [
                  req.unit?.unit_number ? `Unit ${req.unit.unit_number}` : null,
                  req.property?.name ?? null,
                ]
                  .filter(Boolean)
                  .join(' · ') || '—';
              // Semantic role driven by real priority + status
              const role = getMaintenanceVariant(req.priority, req.status);

              const menuItems = [
                {
                  label: 'View details',
                  icon: <IconEye size={15} />,
                  onClick: () => setDetailTarget(req),
                },
                ...transitions.map((t) => ({
                  label: t.label,
                  onClick: () => handleTransition(req, t),
                })),
              ];

              return (
                <RecordCard
                  key={req.id}
                  onClick={() => setDetailTarget(req)}
                  leading={
                    <IconTile
                      icon={<CategoryIcon category={req.category} size={18} />}
                      role={role}
                    />
                  }
                  title={req.title}
                  subtitle={
                    <>
                      <span className="text-ink-500">{location}</span>
                      <span className="text-ink-400">
                        {maintenanceCategoryLabel[req.category]}
                      </span>
                    </>
                  }
                  related={
                    <div className="flex flex-col gap-1">
                      <p className="text-xs text-ink-400">Priority</p>
                      <SemanticBadge role={role}>
                        {maintenancePriorityLabel[req.priority]}
                      </SemanticBadge>
                    </div>
                  }
                  indicator={
                    <div className="flex flex-col gap-0.5">
                      <p className="text-xs font-medium text-ink-700">
                        {formatDateTime(req.submitted_at ?? req.created_at)}
                      </p>
                      {req.resolved_at ? (
                        <p className="text-[11px] text-ink-400">
                          Resolved {timeAgo(req.resolved_at)}
                        </p>
                      ) : req.acknowledged_at ? (
                        <p className="text-[11px] text-ink-400">
                          Acknowledged {timeAgo(req.acknowledged_at)}
                        </p>
                      ) : (
                        <p className="text-[11px] text-ink-400">
                          Submitted {timeAgo(req.submitted_at ?? req.created_at)}
                        </p>
                      )}
                    </div>
                  }
                  status={
                    <StatusChip tone={maintenanceStatusTone[req.status]}>
                      {maintenanceStatusLabel[req.status]}
                    </StatusChip>
                  }
                  primaryAction={
                    transitions.length > 0 ? (
                      <Button
                        size="sm"
                        onClick={() => handleTransition(req, transitions[0])}
                      >
                        {transitions[0].label}
                      </Button>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        leftIcon={<IconEye size={14} />}
                        onClick={() => setDetailTarget(req)}
                      >
                        View
                      </Button>
                    )
                  }
                  menu={<ActionMenu items={menuItems} />}
                />
              );
            })}
          </RecordList>

          {/* Pagination — below the cards, never inside a table shell. */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-ink-500">{rangeLabel(slice, 'request')}</p>
            <Pagination slice={slice} onPage={setPage} />
          </div>
        </div>
      )}

      {/* Read-only detail drawer */}
      <DetailDrawer
        open={detailTarget !== null}
        onClose={() => setDetailTarget(null)}
        eyebrow="MAINTENANCE"
        title={detailTarget?.title ?? 'Request details'}
        footer={
          <Button variant="secondary" onClick={() => setDetailTarget(null)}>
            Close
          </Button>
        }
      >
        {detailTarget && (
          <div className="space-y-5">
            {/* Status + priority badges */}
            <div className="flex flex-wrap items-center gap-2">
              <SemanticBadge role={getMaintenanceVariant(detailTarget.priority, detailTarget.status)}>
                {maintenanceStatusLabel[detailTarget.status]}
              </SemanticBadge>
              <SemanticBadge role={getMaintenanceVariant(detailTarget.priority, detailTarget.status)}>
                {maintenancePriorityLabel[detailTarget.priority]}
              </SemanticBadge>
            </div>

            {/* Description */}
            <div>
              <p className="mb-1 text-xs font-medium text-ink-400 uppercase tracking-wide">Description</p>
              <p className="whitespace-pre-line text-sm text-ink-700">{detailTarget.description}</p>
            </div>

            {/* Meta grid */}
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-xs text-ink-400">Category</dt>
                <dd className="mt-1 text-sm font-medium text-ink-900">
                  {maintenanceCategoryLabel[detailTarget.category]}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-ink-400">Location</dt>
                <dd className="mt-1 text-sm font-medium text-ink-900">
                  {[
                    detailTarget.unit?.unit_number ? `Unit ${detailTarget.unit.unit_number}` : null,
                    detailTarget.property?.name ?? null,
                  ].filter(Boolean).join(' · ') || '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-ink-400">Submitted</dt>
                <dd className="mt-1 text-sm font-medium text-ink-900">
                  {formatDateTime(detailTarget.submitted_at ?? detailTarget.created_at)}
                </dd>
              </div>
              {detailTarget.acknowledged_at && (
                <div>
                  <dt className="text-xs text-ink-400">Acknowledged</dt>
                  <dd className="mt-1 text-sm font-medium text-ink-900">
                    {formatDate(detailTarget.acknowledged_at)}
                  </dd>
                </div>
              )}
              {detailTarget.resolved_at && (
                <div>
                  <dt className="text-xs text-ink-400">Resolved</dt>
                  <dd className="mt-1 text-sm font-medium text-ink-900">
                    {formatDate(detailTarget.resolved_at)}
                  </dd>
                </div>
              )}
              {detailTarget.closed_at && (
                <div>
                  <dt className="text-xs text-ink-400">Closed</dt>
                  <dd className="mt-1 text-sm font-medium text-ink-900">
                    {formatDate(detailTarget.closed_at)}
                  </dd>
                </div>
              )}
            </dl>

            {/* Resolution notes */}
            {detailTarget.resolution_notes && (
              <div className="rounded-xl border border-ink-200 bg-ink-50/60 px-3 py-2.5">
                <p className="mb-1 text-xs font-medium text-ink-500">Resolution notes</p>
                <p className="text-sm text-ink-700">{detailTarget.resolution_notes}</p>
              </div>
            )}
          </div>
        )}
      </DetailDrawer>

      {/* Status-update drawer (resolution_notes flow — PRESERVED) */}
      <DetailDrawer
        open={updateTarget !== null}
        onClose={() => { if (!updating) setUpdateTarget(null); }}
        eyebrow="MAINTENANCE"
        title={updateTarget?.transition.label ?? 'Update status'}
        description={updateTarget?.req.title}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setUpdateTarget(null)}
              disabled={updating}
            >
              Cancel
            </Button>
            <Button onClick={confirmUpdate} loading={updating}>
              {updateTarget?.transition.label ?? 'Confirm'}
            </Button>
          </>
        }
      >
        <label
          className="mb-1.5 block text-sm font-medium text-ink-700"
          htmlFor="resolve-notes"
        >
          Resolution notes{' '}
          <span className="font-normal text-ink-400">(optional)</span>
        </label>
        <Textarea
          id="resolve-notes"
          rows={4}
          placeholder="Describe what was done to resolve the issue. The tenant will see this."
          value={resolveNotes}
          onChange={(e) => setResolveNotes(e.target.value)}
          disabled={updating}
        />
      </DetailDrawer>
    </div>
  );
}
