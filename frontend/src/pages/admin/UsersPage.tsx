import { useEffect, useState } from 'react';
import { useApi } from '@/hooks/useApi';
import { adminApi } from '@/lib/endpoints';
import { normalizeError } from '@/lib/api';
import { formatDate, humanize, formatCents } from '@/lib/format';
import { useToast } from '@/components/ui/toast';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Table, THead, TH, TBody, TR, TD } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { Field, Input, Select, Textarea } from '@/components/ui/Field';
import { Spinner } from '@/components/ui/Spinner';
import {
  LoadingState,
  ErrorState,
  EmptyState,
  ForbiddenState,
  Skeleton,
} from '@/components/ui/states';
import {
  IconUsers,
  IconEye,
  IconLock,
  IconUnlock,
  IconChevronLeft,
  IconChevronRight,
  IconSearch,
} from '@/components/ui/icons';
import {
  SemanticBadge,
  NexusCard,
  getApplicationVariant,
  getContractVariant,
} from '@/components/cards';
import type {
  AdminUserSummary,
  AdminUserDetail,
  ApiError,
  Contract,
  Application,
} from '@/lib/types';

/* ---- Filter option types ------------------------------------------------- */
type TypeFilter = 'all' | 'tenant' | 'landlord';
type StatusFilter = 'all' | 'active' | 'suspended';

const TYPE_OPTIONS: { value: TypeFilter; label: string }[] = [
  { value: 'all', label: 'All roles' },
  { value: 'tenant', label: 'Tenants' },
  { value: 'landlord', label: 'Landlords' },
];

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
];

function isSuspended(user: AdminUserSummary): boolean {
  return user.suspended_at !== null;
}

function initials(user: { first_name?: string; last_name?: string; email: string }): string {
  const a = user.first_name?.[0] ?? '';
  const b = user.last_name?.[0] ?? '';
  return (a + b || user.email[0] || '?').toUpperCase();
}

/* ---- Skeleton rows ------------------------------------------------------- */
function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <TR key={i}>
          <TD first>
            <div className="flex items-center gap-2.5">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-4 w-32" />
            </div>
          </TD>
          <TD><Skeleton className="h-4 w-40" /></TD>
          <TD><Skeleton className="h-5 w-16 rounded-full" /></TD>
          <TD><Skeleton className="h-5 w-16 rounded-full" /></TD>
          <TD><Skeleton className="h-5 w-16 rounded-full" /></TD>
          <TD><Skeleton className="h-4 w-24" /></TD>
          <TD><Skeleton className="h-4 w-16" /></TD>
          <TD><Skeleton className="h-8 w-28" /></TD>
        </TR>
      ))}
    </>
  );
}

/* ========================================================================== */
/* Detail modal — fetches the full user record when opened                    */
/* ========================================================================== */
function UserDetailModal({
  userId,
  onClose,
}: {
  userId: number;
  onClose: () => void;
}) {
  const { data, loading, error, reload } = useApi<AdminUserDetail>(
    () => adminApi.user(userId),
    [userId],
  );

  const user = data?.user;
  const title = user ? user.full_name : 'User detail';

  return (
    <Modal open onClose={onClose} title={title} size="lg">
      {loading ? (
        <div className="py-10">
          <LoadingState label="Loading user…" />
        </div>
      ) : error ? (
        <ErrorState message={error.message} onRetry={reload} />
      ) : data && user ? (
        <div className="space-y-6">
          {/* Identity row */}
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-info-50 text-sm font-bold text-info-600">
              {user.initials || initials(user)}
            </span>
            <div className="min-w-0">
              <p className="font-display text-lg font-semibold text-ink-900 leading-tight">
                {user.full_name}
              </p>
              <p className="text-sm text-ink-500 truncate">{user.email}</p>
            </div>
          </div>

          {/* Badges — semantic roles */}
          <div className="flex flex-wrap gap-2">
            <SemanticBadge role={user.user_type === 'landlord' ? 'info' : 'neutral'} dot={false}>
              {humanize(user.user_type)}
            </SemanticBadge>
            {user.identity_verified ? (
              <SemanticBadge role="success" dot={false}>Verified</SemanticBadge>
            ) : (
              <SemanticBadge role="warning" dot={false}>Unverified</SemanticBadge>
            )}
            {user.suspended_at ? (
              <SemanticBadge role="danger" dot={false}>Suspended</SemanticBadge>
            ) : (
              <SemanticBadge role="success" dot={false}>Active</SemanticBadge>
            )}
          </div>

          {/* Contact / meta */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
            <Meta label="Phone" value={user.phone ?? '—'} />
            <Meta label="City" value={user.city ?? '—'} />
            <Meta label="Joined" value={formatDate(user.created_at)} />
            {user.suspended_at && (
              <Meta label="Suspended" value={formatDate(user.suspended_at)} />
            )}
          </div>

          {/* Stats — real counts from backend */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <DetailStat label="Properties" value={data.stats.properties} />
            <DetailStat label="Listings" value={data.stats.listings} />
            <DetailStat label="Active leases" value={data.stats.active_contracts} />
            <DetailStat label="Applications" value={data.stats.applications} />
          </div>

          {/* Recent contracts */}
          <section>
            <h3 className="mb-2 eyebrow text-ink-500">Recent contracts</h3>
            {data.recent_contracts.length === 0 ? (
              <EmptyRow text="No contracts on record." />
            ) : (
              <ul className="divide-y divide-ink-200 rounded-xl border border-ink-200">
                {data.recent_contracts.map((c: Contract) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink-900">
                        {c.listing?.title ?? `Contract ${c.id.slice(0, 8)}`}
                      </p>
                      <p className="text-xs text-ink-500">
                        {formatCents(c.rent_amount)}/mo · from {formatDate(c.start_date)}
                      </p>
                    </div>
                    <SemanticBadge role={getContractVariant(c.status)} dot={false}>
                      {humanize(c.status)}
                    </SemanticBadge>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Recent applications */}
          <section>
            <h3 className="mb-2 eyebrow text-ink-500">Recent applications</h3>
            {data.recent_applications.length === 0 ? (
              <EmptyRow text="No applications on record." />
            ) : (
              <ul className="divide-y divide-ink-200 rounded-xl border border-ink-200">
                {data.recent_applications.map((a: Application) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink-900">
                        {a.listing?.title ?? `Application #${a.id}`}
                      </p>
                      <p className="text-xs text-ink-500">
                        Applied {formatDate(a.submitted_at ?? a.created_at)}
                      </p>
                    </div>
                    <SemanticBadge role={getApplicationVariant(a.status)} dot={false}>
                      {humanize(a.status)}
                    </SemanticBadge>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : null}
    </Modal>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="eyebrow text-ink-400">{label}</p>
      <p className="mt-0.5 text-sm text-ink-800">{value}</p>
    </div>
  );
}

/** Stat tile inside the user detail modal — Level-1 quiet NexusCard. */
function DetailStat({ label, value }: { label: string; value: number }) {
  return (
    <NexusCard role="neutral" className="px-4 py-3 text-center">
      <p className="font-display text-2xl font-semibold text-ink-900 num-old">{value}</p>
      <p className="mt-0.5 text-xs text-ink-500">{label}</p>
    </NexusCard>
  );
}

function EmptyRow({ text }: { text: string }) {
  return (
    <p className="rounded-xl border border-dashed border-ink-200 bg-ink-50/40 px-4 py-4 text-center text-sm text-ink-500">
      {text}
    </p>
  );
}

/* ========================================================================== */
/* Suspend modal — requires a reason                                          */
/* ========================================================================== */
function SuspendModal({
  user,
  onClose,
  onDone,
}: {
  user: AdminUserSummary;
  onClose: () => void;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [fieldError, setFieldError] = useState<string | undefined>();

  async function handleSubmit() {
    const trimmed = reason.trim();
    if (trimmed.length < 3) {
      setFieldError('Please provide a brief reason.');
      return;
    }
    setSubmitting(true);
    setFieldError(undefined);
    try {
      await adminApi.suspendUser(user.id, trimmed);
      toast(`${user.full_name} suspended.`, 'success');
      onDone();
    } catch (err) {
      const e = normalizeError(err) as ApiError;
      if (e.status === 422) {
        toast(e.message || 'This account is already suspended.', 'error');
        onDone();
      } else {
        toast(e.message || 'Could not suspend this account.', 'error');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open
      onClose={submitting ? () => {} : onClose}
      title="Suspend account"
      description={`${user.full_name} will lose access until reinstated.`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Suspending…' : 'Suspend account'}
          </Button>
        </>
      }
    >
      <Field label="Reason for suspension" required error={fieldError}>
        {(id, invalid) => (
          <Textarea
            id={id}
            invalid={invalid}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Reported fraudulent listings; pending investigation."
            autoFocus
          />
        )}
      </Field>
    </Modal>
  );
}

/* ========================================================================== */
/* Main page                                                                  */
/* ========================================================================== */
export function UsersPage() {
  const { toast } = useToast();

  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Debounce the search box into the query that actually hits the backend.
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, loading, error, reload } = useApi(
    () =>
      adminApi.users({
        type: typeFilter === 'all' ? undefined : typeFilter,
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: search || undefined,
        page,
      }),
    [typeFilter, statusFilter, search, page],
  );

  const [actingId, setActingId] = useState<number | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<AdminUserSummary | null>(null);

  const users = data?.data ?? [];
  const currentPage = data?.current_page ?? 1;
  const lastPage = data?.last_page ?? 1;
  const total = data?.total ?? 0;

  async function handleReinstate(user: AdminUserSummary) {
    setActingId(user.id);
    try {
      await adminApi.activateUser(user.id);
      toast(`${user.full_name} reinstated.`, 'success');
      reload();
    } catch (err) {
      const e = normalizeError(err) as ApiError;
      toast(
        e.status === 422
          ? e.message || 'This account is already active.'
          : e.message || 'Could not reinstate this account.',
        e.status === 422 ? 'info' : 'error',
      );
      if (e.status === 422) reload();
    } finally {
      setActingId(null);
    }
  }

  function changeType(value: TypeFilter) {
    setTypeFilter(value);
    setPage(1);
  }

  function changeStatus(value: StatusFilter) {
    setStatusFilter(value);
    setPage(1);
  }

  // 403 — admin gate failed server-side.
  if (error?.status === 403) {
    return (
      <div className="animate-rise space-y-6">
        <PageHeader eyebrow="Platform" title="Users" />
        <ForbiddenState
          title="Users unavailable"
          message="Your account doesn't have access to platform user management."
        />
      </div>
    );
  }

  return (
    <div className="animate-rise space-y-6">
      <PageHeader
        eyebrow="Platform"
        title="Users"
        description="List, inspect, and moderate tenants and landlords across the platform."
      />

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-44">
          <Field label="Role">
            {(id) => (
              <Select
                id={id}
                value={typeFilter}
                onChange={(e) => changeType(e.target.value as TypeFilter)}
              >
                {TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </Select>
            )}
          </Field>
        </div>
        <div className="w-44">
          <Field label="Status">
            {(id) => (
              <Select
                id={id}
                value={statusFilter}
                onChange={(e) => changeStatus(e.target.value as StatusFilter)}
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </Select>
            )}
          </Field>
        </div>
        <div className="min-w-[220px] flex-1 max-w-sm">
          <Field label="Search">
            {(id) => (
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-ink-400">
                  <IconSearch size={16} />
                </span>
                <Input
                  id={id}
                  type="search"
                  className="pl-9"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Name or email…"
                />
              </div>
            )}
          </Field>
        </div>
      </div>

      {error ? (
        <ErrorState message={error.message} onRetry={reload} />
      ) : !loading && users.length === 0 ? (
        <EmptyState
          icon={<IconUsers />}
          title="No users found"
          description={
            search || typeFilter !== 'all' || statusFilter !== 'all'
              ? 'No users match these filters. Try widening your search.'
              : 'No users have registered yet.'
          }
        />
      ) : (
        <>
          <Card>
            <CardBody className="p-0">
              <Table>
                <THead>
                  <TR>
                    <TH>Name</TH>
                    <TH>Email</TH>
                    <TH>Role</TH>
                    <TH>Verified</TH>
                    <TH>Status</TH>
                    <TH>Joined</TH>
                    <TH>Portfolio</TH>
                    <TH>{/* actions */}</TH>
                  </TR>
                </THead>
                <TBody>
                  {loading ? (
                    <SkeletonRows />
                  ) : (
                    users.map((user) => {
                      const suspended = isSuspended(user);
                      const busy = actingId === user.id;
                      return (
                        <TR key={user.id}>
                          <TD first>
                            <div className="flex items-center gap-2.5">
                              {/* Avatar ring: info teal for landlords, neutral for tenants */}
                              <span
                                className={[
                                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
                                  user.user_type === 'landlord'
                                    ? 'bg-info-50 text-info-600'
                                    : 'bg-ink-100 text-ink-600',
                                ].join(' ')}
                              >
                                {initials(user)}
                              </span>
                              <span className="font-medium text-ink-900">{user.full_name}</span>
                            </div>
                          </TD>
                          <TD className="text-ink-500 text-xs">{user.email}</TD>
                          <TD>
                            {/* Role: landlord = info (teal), tenant = neutral */}
                            <SemanticBadge
                              role={user.user_type === 'landlord' ? 'info' : 'neutral'}
                              dot={false}
                            >
                              {humanize(user.user_type)}
                            </SemanticBadge>
                          </TD>
                          <TD>
                            {user.identity_verified ? (
                              <SemanticBadge role="success">Verified</SemanticBadge>
                            ) : (
                              <SemanticBadge role="warning">Unverified</SemanticBadge>
                            )}
                          </TD>
                          <TD>
                            {suspended ? (
                              <SemanticBadge role="danger">Suspended</SemanticBadge>
                            ) : (
                              <SemanticBadge role="success">Active</SemanticBadge>
                            )}
                          </TD>
                          <TD className="whitespace-nowrap text-ink-500 text-xs">
                            {formatDate(user.created_at)}
                          </TD>
                          <TD className="whitespace-nowrap text-ink-600 text-xs">
                            {user.user_type === 'landlord' ? (
                              <span>
                                {user.properties_count} {user.properties_count === 1 ? 'property' : 'properties'}
                                {' · '}
                                {user.listings_count} {user.listings_count === 1 ? 'listing' : 'listings'}
                              </span>
                            ) : (
                              <span>
                                {user.applications_count} {user.applications_count === 1 ? 'application' : 'applications'}
                              </span>
                            )}
                          </TD>
                          <TD>
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="ghost"
                                size="sm"
                                leftIcon={<IconEye size={14} />}
                                onClick={() => setDetailId(user.id)}
                              >
                                View
                              </Button>
                              {suspended ? (
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  leftIcon={<IconUnlock size={14} />}
                                  disabled={busy}
                                  onClick={() => handleReinstate(user)}
                                >
                                  {busy ? 'Working…' : 'Reinstate'}
                                </Button>
                              ) : (
                                <Button
                                  variant="danger"
                                  size="sm"
                                  leftIcon={<IconLock size={14} />}
                                  disabled={busy}
                                  onClick={() => setSuspendTarget(user)}
                                >
                                  Suspend
                                </Button>
                              )}
                            </div>
                          </TD>
                        </TR>
                      );
                    })
                  )}
                </TBody>
              </Table>
            </CardBody>
          </Card>

          {/* Pagination */}
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs text-ink-500">
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner size={14} /> Loading…
                </span>
              ) : (
                `${total} ${total === 1 ? 'user' : 'users'} total`
              )}
            </p>
            {lastPage > 1 && (
              <div className="flex items-center gap-4">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={currentPage <= 1 || loading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  leftIcon={<IconChevronLeft className="h-4 w-4" />}
                >
                  Previous
                </Button>
                <span className="text-sm text-ink-500">
                  Page {currentPage} of {lastPage}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={currentPage >= lastPage || loading}
                  onClick={() => setPage((p) => p + 1)}
                  leftIcon={<IconChevronRight className="h-4 w-4" />}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Detail modal */}
      {detailId !== null && (
        <UserDetailModal userId={detailId} onClose={() => setDetailId(null)} />
      )}

      {/* Suspend modal */}
      {suspendTarget && (
        <SuspendModal
          user={suspendTarget}
          onClose={() => setSuspendTarget(null)}
          onDone={() => {
            setSuspendTarget(null);
            reload();
          }}
        />
      )}
    </div>
  );
}
