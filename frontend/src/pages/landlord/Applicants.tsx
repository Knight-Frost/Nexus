import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useApi } from '@/hooks/useApi';
import { landlordApi } from '@/lib/endpoints';
import { fieldErrors } from '@/lib/api';
import type { ApiError, Application, ApplicationStatus } from '@/lib/types';
import { formatDate, timeAgo, storageUrl } from '@/lib/format';
import { paginate, rangeLabel } from '@/lib/paginate';
import { applicationStatusLabel, applicationStatusTone } from '@/lib/statusMaps';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { RecordList, RecordCard, RecordRelated } from '@/components/ui/RecordCard';
import { DetailDrawer } from '@/components/ui/Drawer';
import { Field, Textarea } from '@/components/ui/Field';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import {
  CommandBar,
  SearchInput,
  FilterTabs,
  SortSelect,
  Pagination,
  ActionMenu,
  Thumbnail,
  type FilterTab,
  type SelectOption,
} from '@/components/landlord/primitives';
import {
  IconUsers,
  IconCheckCircle,
  IconXCircle,
  IconAlertCircle,
  IconShield,
  IconMail,
  IconPhone,
  IconCheck,
  IconX,
} from '@/components/ui/icons';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/cn';
import {
  StatusCard,
  SemanticBadge,
  DashboardSection,
  DataCardGrid,
  getApplicationVariant,
  getReviewQueueVariant,
} from '@/components/cards';

/* ---- Constants ----------------------------------------------------------- */
const PER_PAGE = 10;

type FilterKey = 'all' | ApplicationStatus;
type SortKey = 'newest' | 'oldest' | 'readiness_high';

const SORT_OPTIONS: SelectOption<SortKey>[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'readiness_high', label: 'Readiness (high → low)' },
];

const DECIDABLE_STATUSES: ApplicationStatus[] = ['submitted', 'in_review', 'landlord_review'];

function isDecidable(status: ApplicationStatus): boolean {
  return (DECIDABLE_STATUSES as string[]).includes(status);
}

/* ---- Avatar (photo when available, else initials) ------------------------ */
function AvatarCircle({ name, src }: { name: string; src?: string | null }) {
  return (
    <Avatar
      name={name}
      src={src}
      className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-100 text-sm font-semibold text-brand-700 select-none"
    />
  );
}

/* ---- Readiness column ---------------------------------------------------- */
function ReadinessCell({
  readiness,
}: {
  readiness?: Application['readiness'];
}) {
  if (!readiness) return <span className="text-xs text-ink-400">—</span>;

  const { percentage, items } = readiness;
  const scoreColor =
    percentage >= 80
      ? 'text-success-600'
      : percentage >= 50
      ? 'text-warning-600'
      : 'text-danger-600';

  return (
    <div className="flex flex-col gap-1.5">
      <span className={cn('font-display text-sm font-semibold tabular-nums', scoreColor)}>
        Ready {percentage}%
      </span>
      <ul className="flex flex-col gap-0.5">
        {items.map((item) => (
          <li
            key={item.key}
            title={item.label}
            className="flex items-center gap-1 text-xs text-ink-500 leading-tight"
          >
            {item.complete ? (
              <IconCheckCircle size={12} className="shrink-0 text-success-500" />
            ) : (
              <IconXCircle size={12} className="shrink-0 text-ink-300" />
            )}
            <span className="truncate max-w-[9rem]">{item.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ========================================================================= */
export function Applicants() {
  const { data, loading, error, reload } = useApi(() => landlordApi.applications(), []);
  const { toast } = useToast();

  /* ---- State ------------------------------------------------------------ */
  const [apps, setApps] = useState<Application[] | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterKey>('all');
  const [listingFilter, setListingFilter] = useState('all');
  const [sort, setSort] = useState<SortKey>('newest');
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);

  // Review / decision modal
  const [reviewTarget, setReviewTarget] = useState<Application | null>(null);
  const [modalDecision, setModalDecision] = useState<'approve' | 'reject' | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState('');
  const [decidingId, setDecidingId] = useState<number | null>(null);

  /* ---- Derived list (server data + local optimistic updates) ------------ */
  const list = useMemo<Application[]>(() => apps ?? data ?? [], [apps, data]);

  function applyDecision(updated: Application) {
    setApps((prev) => {
      const base = prev ?? data ?? [];
      return base.map((a) => (a.id === updated.id ? updated : a));
    });
  }

  /* ---- KPIs (all real) -------------------------------------------------- */
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  const kpi = useMemo(() => {
    const total = list.length;
    const readyToReview = list.filter((a) => a.status === 'landlord_review').length;
    const pendingDecision = list.filter((a) =>
      (['submitted', 'in_review', 'landlord_review'] as ApplicationStatus[]).includes(a.status),
    ).length;
    const approvedThisMonth = list.filter(
      (a) =>
        a.status === 'approved' &&
        a.decided_at != null &&
        new Date(a.decided_at).getTime() >= startOfMonth,
    ).length;
    return { total, readyToReview, pendingDecision, approvedThisMonth };
  }, [list, startOfMonth]);

  /* ---- Listing filter options ------------------------------------------ */
  const listingOptions = useMemo<SelectOption<string>[]>(() => {
    const seen = new Map<string, string>();
    for (const a of list) {
      const key = String(a.listing_id);
      if (!seen.has(key)) {
        seen.set(key, a.listing?.title ?? `Listing #${a.listing_id}`);
      }
    }
    const opts: SelectOption<string>[] = [{ value: 'all', label: 'All listings' }];
    for (const [value, label] of seen) opts.push({ value, label });
    return opts;
  }, [list]);

  /* ---- Status tab counts ------------------------------------------------ */
  const tabCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const a of list) c[a.status] = (c[a.status] ?? 0) + 1;
    return c;
  }, [list]);

  const filterTabs: FilterTab<FilterKey>[] = [
    { key: 'all', label: 'All', count: list.length },
    {
      key: 'submitted',
      label: applicationStatusLabel.submitted,
      count: tabCounts.submitted ?? 0,
      tone: applicationStatusTone.submitted,
    },
    {
      key: 'landlord_review',
      label: applicationStatusLabel.landlord_review,
      count: tabCounts.landlord_review ?? 0,
      tone: applicationStatusTone.landlord_review,
    },
    {
      key: 'approved',
      label: applicationStatusLabel.approved,
      count: tabCounts.approved ?? 0,
      tone: applicationStatusTone.approved,
    },
    {
      key: 'rejected',
      label: applicationStatusLabel.rejected,
      count: tabCounts.rejected ?? 0,
      tone: applicationStatusTone.rejected,
    },
    {
      key: 'withdrawn',
      label: applicationStatusLabel.withdrawn,
      count: tabCounts.withdrawn ?? 0,
      tone: applicationStatusTone.withdrawn,
    },
  ];

  /* ---- Filter + sort pipeline ------------------------------------------ */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = list.filter((a) => {
      if (statusFilter !== 'all' && a.status !== statusFilter) return false;
      if (listingFilter !== 'all' && String(a.listing_id) !== listingFilter) return false;
      if (q) {
        const hay = [
          a.tenant?.full_name ?? '',
          a.tenant?.email ?? '',
          a.tenant?.phone ?? '',
          a.listing?.title ?? '',
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    rows = [...rows].sort((a, b) => {
      switch (sort) {
        case 'oldest':
          return (
            new Date(a.submitted_at ?? a.created_at).getTime() -
            new Date(b.submitted_at ?? b.created_at).getTime()
          );
        case 'readiness_high':
          return (b.readiness?.percentage ?? 0) - (a.readiness?.percentage ?? 0);
        case 'newest':
        default:
          return (
            new Date(b.submitted_at ?? b.created_at).getTime() -
            new Date(a.submitted_at ?? a.created_at).getTime()
          );
      }
    });
    return rows;
  }, [list, search, statusFilter, listingFilter, sort]);

  const slice = paginate(filtered, page, PER_PAGE);

  function resetPage() {
    setPage(1);
  }

  /* ---- Decision handlers ------------------------------------------------ */
  async function decide(
    app: Application,
    decision: 'approved' | 'rejected',
    reason?: string,
  ): Promise<boolean> {
    setDecidingId(app.id);
    try {
      const updated = await landlordApi.decideApplication(app.id, decision, reason);
      applyDecision(updated);
      toast(decision === 'approved' ? 'Application approved.' : 'Application rejected.', 'success');
      return true;
    } catch (err) {
      const apiErr = err as ApiError;
      const flat = fieldErrors(apiErr);
      const message =
        flat.decision_reason ||
        flat.decision ||
        apiErr.message ||
        'Could not record the decision. Please try again.';
      if (decision === 'rejected') setRejectError(message);
      else toast(message, 'error');
      reload();
      return false;
    } finally {
      setDecidingId(null);
    }
  }

  function openReview(app: Application, preset?: 'approve' | 'reject') {
    setReviewTarget(app);
    setModalDecision(preset ?? null);
    setRejectReason('');
    setRejectError('');
  }

  function closeReview() {
    if (decidingId !== null) return;
    setReviewTarget(null);
    setModalDecision(null);
    setRejectReason('');
    setRejectError('');
  }

  async function handleModalApprove() {
    if (!reviewTarget) return;
    const ok = await decide(reviewTarget, 'approved');
    if (ok) closeReview();
  }

  async function handleModalReject() {
    if (!reviewTarget) return;
    const ok = await decide(reviewTarget, 'rejected', rejectReason.trim() || undefined);
    if (ok) closeReview();
  }

  async function handleExport() {
    setExporting(true);
    try {
      await landlordApi.exportApplications();
      toast('Applicants exported', 'success');
    } catch {
      toast('Export failed', 'error');
    } finally {
      setExporting(false);
    }
  }

  /* ---- Loading / error states ------------------------------------------ */
  if (loading) return <LoadingState label="Loading applicants…" />;

  if (error) {
    return (
      <ErrorState
        title="Couldn't load applicants"
        message={error.message}
        onRetry={reload}
      />
    );
  }

  /* ---- Empty (zero data) ------------------------------------------------ */
  if (list.length === 0) {
    return (
      <div className="animate-rise space-y-6">
        <PageHeader
          eyebrow="Operations"
          title="Applicants"
          description="Review and decide on tenant applications for your listings."
          action={
            <Button variant="secondary" onClick={handleExport} loading={exporting} disabled>
              Export
            </Button>
          }
        />
        <EmptyState
          icon={<IconUsers size={26} />}
          title="No applicants yet"
          description="When tenants apply to your active listings, they'll appear here for review."
          action={
            <Link to="/app/listings">
              <Button variant="secondary">View listings</Button>
            </Link>
          }
        />
      </div>
    );
  }

  /* ---- Main render ------------------------------------------------------ */
  return (
    <div className="animate-rise space-y-10">
      {/* Page header */}
      <PageHeader
        eyebrow="Operations"
        title="Applicants"
        description="Review and decide on tenant applications for your listings."
        action={
          <>
            <Button
              variant="secondary"
              onClick={handleExport}
              loading={exporting}
              disabled={list.length === 0}
            >
              Export
            </Button>
            <Button
              onClick={() => {
                setStatusFilter('landlord_review');
                resetPage();
              }}
            >
              Review queue
            </Button>
          </>
        }
      />

      {/* KPI row — semantic roles from real data */}
      <DashboardSection eyebrow="APPLICANT OVERVIEW">
        <DataCardGrid cols={4}>
          <StatusCard
            label="Total applicants"
            value={kpi.total}
            sub="Across all listings"
            icon={<IconUsers size={18} />}
            role="neutral"
          />
          <StatusCard
            label="Ready to review"
            value={kpi.readyToReview}
            sub="Status: landlord review"
            role={getReviewQueueVariant(kpi.readyToReview)}
            icon={<IconAlertCircle size={18} />}
          />
          <StatusCard
            label="Pending decision"
            value={kpi.pendingDecision}
            sub="Submitted + in review"
            role={kpi.pendingDecision > 0 ? 'warning' : 'neutral'}
            icon={<IconAlertCircle size={18} />}
          />
          <StatusCard
            label="Approved this month"
            value={kpi.approvedThisMonth}
            sub="Successful applications"
            role={kpi.approvedThisMonth > 0 ? 'success' : 'neutral'}
            icon={<IconCheckCircle size={18} />}
          />
        </DataCardGrid>
      </DashboardSection>

      {/* Command bar */}
      <CommandBar>
        <SearchInput
          value={search}
          onChange={(v) => { setSearch(v); resetPage(); }}
          placeholder="Search by name, email, phone or listing…"
          label="Search applicants"
        />
        <SortSelect
          value={listingFilter}
          onChange={(v) => { setListingFilter(v); resetPage(); }}
          options={listingOptions}
          label="Filter by listing"
          prefix=""
        />
        <FilterTabs
          tabs={filterTabs}
          value={statusFilter}
          onChange={(k) => { setStatusFilter(k); resetPage(); }}
        />
        <SortSelect
          value={sort}
          onChange={setSort}
          options={SORT_OPTIONS}
          label="Sort applicants"
        />
      </CommandBar>

      {/* Record list — one standalone card per applicant. No table shell, no
          horizontal scroll: identity + listing + readiness + status + action
          all stay visible (stacking on mobile, inline columns on desktop). */}
      {slice.total === 0 ? (
        <EmptyState
          icon={<IconUsers size={26} />}
          title="No applicants match"
          description="Try adjusting the search term or filter."
        />
      ) : (
        <div className="space-y-5">
          <RecordList>
            {slice.items.map((app) => {
              const tenant = app.tenant;
              const name = tenant?.full_name ?? `Applicant #${app.id}`;
              const listing = app.listing;
              const unit = listing?.unit;
              const property = unit?.property;
              const decidable = isDecidable(app.status);
              const isBusy = decidingId === app.id;

              const menuItems = decidable
                ? [
                    {
                      label: 'Approve',
                      icon: <IconCheck size={14} />,
                      onClick: () => openReview(app, 'approve'),
                    },
                    {
                      label: 'Decline',
                      icon: <IconX size={14} />,
                      danger: true,
                      onClick: () => openReview(app, 'reject'),
                    },
                  ]
                : [];

              return (
                <RecordCard
                  key={app.id}
                  onClick={() => openReview(app)}
                  leading={<AvatarCircle name={name} src={app.tenant?.avatar_url} />}
                  title={name}
                  titleMeta={
                    tenant?.identity_verified ? (
                      <IconShield
                        size={13}
                        className="text-success-500"
                        title="Identity verified"
                      />
                    ) : undefined
                  }
                  subtitle={
                    <>
                      {tenant?.email && (
                        <span className="flex items-center gap-1 text-ink-500">
                          <IconMail size={11} className="shrink-0" />
                          {tenant.email}
                        </span>
                      )}
                      {tenant?.phone && (
                        <span className="flex items-center gap-1 text-ink-400">
                          <IconPhone size={11} className="shrink-0" />
                          {tenant.phone}
                        </span>
                      )}
                    </>
                  }
                  related={
                    <RecordRelated
                      thumbnail={
                        <Thumbnail
                          src={storageUrl(listing?.primary_photo?.path)}
                          alt={listing?.title ?? 'Listing'}
                          seed={listing?.title ?? ''}
                          size={44}
                        />
                      }
                      title={listing?.title ?? `Listing #${app.listing_id}`}
                      lines={[
                        [unit ? `Unit ${unit.unit_number}` : null, property?.name]
                          .filter(Boolean)
                          .join(' · ') || '—',
                      ]}
                    />
                  }
                  indicator={<ReadinessCell readiness={app.readiness} />}
                  status={
                    <SemanticBadge role={getApplicationVariant(app.status)}>
                      {applicationStatusLabel[app.status]}
                    </SemanticBadge>
                  }
                  timestamp={
                    <>
                      {formatDate(app.submitted_at ?? app.created_at)} ·{' '}
                      {timeAgo(app.submitted_at ?? app.created_at)}
                    </>
                  }
                  primaryAction={
                    decidable ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        loading={isBusy}
                        disabled={decidingId !== null}
                        onClick={() => openReview(app)}
                      >
                        Review
                      </Button>
                    ) : undefined
                  }
                  menu={menuItems.length > 0 ? <ActionMenu items={menuItems} /> : undefined}
                />
              );
            })}
          </RecordList>

          {/* Pagination — sits below the cards, never inside a table shell. */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-ink-500">{rangeLabel(slice, 'applicant')}</p>
            <Pagination slice={slice} onPage={setPage} />
          </div>
        </div>
      )}

      {/* Review / decision drawer */}
      <DetailDrawer
        open={reviewTarget !== null}
        onClose={closeReview}
        eyebrow="APPLICATION"
        title={
          reviewTarget
            ? `Review application: ${reviewTarget.tenant?.full_name ?? `Applicant #${reviewTarget.id}`}`
            : 'Review application'
        }
        description={
          reviewTarget
            ? `Application for ${reviewTarget.listing?.title ?? `Listing #${reviewTarget.listing_id}`}`
            : undefined
        }
        footer={
          reviewTarget && isDecidable(reviewTarget.status) ? (
            <>
              <Button variant="secondary" onClick={closeReview} disabled={decidingId !== null}>
                Cancel
              </Button>
              <div className="flex gap-2">
                {modalDecision !== 'reject' && (
                  <Button
                    leftIcon={<IconCheck size={14} />}
                    onClick={handleModalApprove}
                    loading={decidingId === reviewTarget?.id}
                    disabled={decidingId !== null}
                    className="bg-success-600 text-white hover:bg-success-500"
                  >
                    Approve
                  </Button>
                )}
                {modalDecision !== 'approve' && (
                  <Button
                    variant="danger"
                    leftIcon={<IconX size={14} />}
                    onClick={handleModalReject}
                    loading={decidingId === reviewTarget?.id}
                    disabled={decidingId !== null}
                  >
                    {modalDecision === 'reject' ? 'Confirm rejection' : 'Decline'}
                  </Button>
                )}
              </div>
            </>
          ) : (
            <Button variant="secondary" onClick={closeReview}>
              Close
            </Button>
          )
        }
      >
        {reviewTarget && (
          <div className="space-y-4">
            {/* Tenant summary */}
            <div className="rounded-xl bg-ink-50 p-4 text-sm space-y-1">
              <p className="font-medium text-ink-900">{reviewTarget.tenant?.full_name ?? '—'}</p>
              {reviewTarget.tenant?.email && (
                <p className="flex items-center gap-1.5 text-ink-600">
                  <IconMail size={13} /> {reviewTarget.tenant.email}
                </p>
              )}
              {reviewTarget.tenant?.phone && (
                <p className="flex items-center gap-1.5 text-ink-600">
                  <IconPhone size={13} /> {reviewTarget.tenant.phone}
                </p>
              )}
              {reviewTarget.tenant?.identity_verified && (
                <p className="flex items-center gap-1.5 text-success-600 text-xs">
                  <IconShield size={12} /> Identity verified
                </p>
              )}
            </div>

            {/* Readiness in drawer */}
            {reviewTarget.readiness && (
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-500">
                  Profile readiness
                </p>
                <ReadinessCell readiness={reviewTarget.readiness} />
              </div>
            )}

            {/* Cover note */}
            {reviewTarget.cover_note && (
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-500">
                  Cover note
                </p>
                <p className="text-sm text-ink-700 whitespace-pre-line">{reviewTarget.cover_note}</p>
              </div>
            )}

            {/* Rejection reason input — shown when declining */}
            {isDecidable(reviewTarget.status) && modalDecision !== 'approve' && (
              <Field
                label="Reason for declining (optional)"
                hint="Shared with the applicant. Leave blank to decline without a note."
                error={rejectError}
              >
                {(id, invalid) => (
                  <Textarea
                    id={id}
                    invalid={invalid}
                    rows={3}
                    placeholder="e.g. The unit has been let to another applicant."
                    value={rejectReason}
                    onChange={(e) => {
                      setRejectReason(e.target.value);
                      if (rejectError) setRejectError('');
                    }}
                  />
                )}
              </Field>
            )}
          </div>
        )}
      </DetailDrawer>
    </div>
  );
}
