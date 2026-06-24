/**
 * TenantManagement — Tenant Roster Operations Console
 *
 * A landlord-facing command console showing all active tenancies, derived
 * entirely from live contracts and ledger data. No occupant counts, auto-pay
 * status, or trend deltas are shown (no backing data). Messaging is omitted
 * because landlords cannot initiate conversations.
 *
 * Data sources:
 *   - landlordApi.contracts()  — all contracts (active + pending_tenant etc.)
 *   - landlordApi.ledger()     — full ledger for payment posture derivation
 */
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Table, THead, TH, TBody, TR, TD } from '@/components/ui/Table';
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '@/components/ui/states';
import {
  IconUsers,
  IconWallet,
  IconClock,
  IconAlertTriangle,
  IconCheckCircle,
  IconLedger,
  IconDoc,
} from '@/components/ui/icons';
import {
  CommandBar,
  SearchInput,
  FilterTabs,
  SortSelect,
  Pagination,
  ActionMenu,
  StatusChip,
  Thumbnail,
  type FilterTab as Tab,
  type SelectOption,
} from '@/components/landlord/primitives';
import { paginate, rangeLabel } from '@/lib/paginate';
import { useApi } from '@/hooks/useApi';
import { landlordApi } from '@/lib/endpoints';
import {
  formatCents,
  formatDate,
  daysUntil,
  humanize,
  contractStatusTone,
  storageUrl,
} from '@/lib/format';
import type { Contract, LedgerEntry } from '@/lib/types';
import {
  StatusCard,
  SemanticBadge,
  CommandCard,
  DashboardSection,
  DataCardGrid,
  getContractVariant,
} from '@/components/cards';

/* ── Constants ─────────────────────────────────────────────────────────────── */

const PER_PAGE = 8;

/** Days before end_date at which a lease is considered "Ending soon". */
const ENDING_SOON_DAYS = 60;

type FilterKey = 'all' | 'active' | 'awaiting_signature' | 'overdue' | 'ending_soon';
type SortKey = 'newest' | 'name_az' | 'rent_high';

const SORT_OPTIONS: SelectOption<SortKey>[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'name_az', label: 'Name A–Z' },
  { value: 'rent_high', label: 'Rent high→low' },
];

/* ── Derived view-model types ───────────────────────────────────────────────── */

type PaymentStatusKey = 'paid' | 'upcoming' | 'overdue';

interface NextPayment {
  amount_cents: number;
  due_date: string | null;
  status: PaymentStatusKey;
  label: string;
}

interface ActiveTenancy {
  contract: Contract;
  tenantName: string;
  tenantEmail: string | null;
  isVerified: boolean;
  property: string;
  propertyCity: string | null;
  unit: string | null;
  listingPhotoPath: string | null;
  listingTitle: string | null;
  nextPayment: NextPayment | null;
  paymentStatus: PaymentStatusKey;
  isOverdue: boolean;
  outstandingCents: number;
  monthsLeft: number | null;
  isEndingSoon: boolean;
}

/* ── Pure derivation helpers ────────────────────────────────────────────────── */

function contractLocation(contract: Contract): {
  property: string;
  city: string | null;
  unit: string | null;
  photoPath: string | null;
  listingTitle: string | null;
} {
  const unit = contract.listing?.unit;
  const property = unit?.property;
  const photo = contract.listing?.primary_photo ?? null;
  return {
    property: property?.name ?? 'Property unavailable',
    city: property?.city ?? null,
    unit: unit?.unit_number ?? null,
    photoPath: photo?.path ?? null,
    listingTitle: contract.listing?.title ?? null,
  };
}

/**
 * From the open ledger entries for a contract, derives:
 *  - The earliest pending/overdue rent or late-fee entry (the "next payment")
 *  - Overdue flag
 *  - Sum of all outstanding (pending+overdue) amount_cents
 */
function derivePaymentPosture(entries: LedgerEntry[]): {
  nextPayment: NextPayment | null;
  isOverdue: boolean;
  outstandingCents: number;
} {
  const open = entries.filter(
    (e) =>
      (e.type === 'rent' || e.type === 'late_fee') &&
      (e.status === 'pending' || e.status === 'overdue'),
  );

  const outstandingCents = open.reduce((sum, e) => sum + e.amount_cents, 0);
  const isOverdue = open.some((e) => e.status === 'overdue');

  const sorted = [...open].sort((a, b) => {
    const at = a.due_date ? new Date(a.due_date).getTime() : Number.MAX_SAFE_INTEGER;
    const bt = b.due_date ? new Date(b.due_date).getTime() : Number.MAX_SAFE_INTEGER;
    return at - bt;
  });

  if (sorted.length === 0) {
    return { nextPayment: null, isOverdue: false, outstandingCents: 0 };
  }

  // Prefer earliest overdue entry so overdue posture surfaces first.
  const overdue = sorted.find((e) => e.status === 'overdue');
  const target = overdue ?? sorted[0];

  const nextPayment: NextPayment = {
    amount_cents: target.amount_cents,
    due_date: target.due_date,
    status: target.status === 'overdue' ? 'overdue' : 'upcoming',
    label: target.status === 'overdue' ? 'Overdue' : 'Upcoming',
  };

  return { nextPayment, isOverdue, outstandingCents };
}

function deriveMonthsLeft(endDate: string | null | undefined): number | null {
  const days = daysUntil(endDate);
  if (days === null) return null;
  return Math.round(days / 30);
}

/* ── Avatar initials ────────────────────────────────────────────────────────── */

function Initials({ name }: { name: string }) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters =
    parts.length >= 2
      ? parts[0][0] + parts[parts.length - 1][0]
      : (parts[0]?.slice(0, 2) ?? '–');
  return (
    <span
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 font-mono text-xs font-semibold text-brand-700"
      aria-hidden="true"
    >
      {letters.toUpperCase()}
    </span>
  );
}

/* ── Payment status chip ────────────────────────────────────────────────────── */

function PaymentChip({ status }: { status: PaymentStatusKey }) {
  if (status === 'overdue') return <StatusChip tone="danger">Overdue</StatusChip>;
  if (status === 'upcoming') return <StatusChip tone="warning">Upcoming</StatusChip>;
  return <StatusChip tone="success">Paid</StatusChip>;
}

/* ── Balance cell ───────────────────────────────────────────────────────────── */

function BalanceCell({ cents }: { cents: number }) {
  if (cents === 0) {
    return <span className="text-sm text-success-600 font-medium">Up to date</span>;
  }
  return (
    <span className="text-sm font-semibold" style={{ color: 'var(--color-danger-600)' }}>
      {formatCents(cents)}
    </span>
  );
}

/* ── Next-payment cell ───────────────────────────────────────────────────────── */

function NextPaymentCell({ nextPayment }: { nextPayment: NextPayment | null }) {
  if (!nextPayment) {
    return <span className="text-sm text-ink-500">All settled</span>;
  }
  const days = daysUntil(nextPayment.due_date);
  let daysLabel = '';
  if (days !== null) {
    if (days < 0) daysLabel = `Overdue ${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''}`;
    else if (days === 0) daysLabel = 'Due today';
    else daysLabel = `in ${days} day${days !== 1 ? 's' : ''}`;
  }
  return (
    <div>
      <p
        className="text-sm font-medium"
        style={{
          color:
            nextPayment.status === 'overdue'
              ? 'var(--color-danger-600)'
              : 'var(--color-ink-900)',
        }}
      >
        {nextPayment.due_date ? formatDate(nextPayment.due_date) : '—'}
      </p>
      {daysLabel && (
        <p
          className="text-xs"
          style={{
            color:
              nextPayment.status === 'overdue'
                ? 'var(--color-danger-500)'
                : 'var(--color-ink-500)',
          }}
        >
          {daysLabel}
        </p>
      )}
    </div>
  );
}

/* ── Lease-detail modal row ─────────────────────────────────────────────────── */

function Row({ label, value, money }: { label: string; value: string; money?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="shrink-0 text-ink-500">{label}</dt>
      <dd
        className="text-right font-medium text-ink-900"
        style={money ? { color: 'var(--color-money)' } : undefined}
      >
        {value}
      </dd>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* Page                                                                        */
/* ═══════════════════════════════════════════════════════════════════════════ */

export function TenantManagement() {
  const navigate = useNavigate();
  const contractsQ = useApi(() => landlordApi.contracts(), []);
  const ledgerQ = useApi(() => landlordApi.ledger(), []);

  /* ── Filter / sort / pagination state ─────────────────────────────────── */
  const [tab, setTab] = useState<FilterKey>('all');
  const [search, setSearch] = useState('');
  const [propertyFilter, setPropertyFilter] = useState<string>('all');
  const [sort, setSort] = useState<SortKey>('newest');
  const [page, setPage] = useState(1);

  /* ── Lease-detail modal ────────────────────────────────────────────────── */
  const [leaseTarget, setLeaseTarget] = useState<ActiveTenancy | null>(null);

  function reload() {
    contractsQ.reload();
    ledgerQ.reload();
  }

  function resetPage() {
    setPage(1);
  }

  const contracts = useMemo(() => contractsQ.data ?? [], [contractsQ.data]);
  const ledger = useMemo(() => ledgerQ.data ?? [], [ledgerQ.data]);

  /* ── Group ledger by contract ─────────────────────────────────────────── */
  const ledgerByContract = useMemo(() => {
    const map = new Map<string, LedgerEntry[]>();
    for (const entry of ledger) {
      const list = map.get(entry.contract_id);
      if (list) list.push(entry);
      else map.set(entry.contract_id, [entry]);
    }
    return map;
  }, [ledger]);

  /* ── Derive active tenancies ──────────────────────────────────────────── */
  const activeTenancies = useMemo<ActiveTenancy[]>(() => {
    return contracts
      .filter((c) => c.status === 'active')
      .map((contract) => {
        const { property, city, unit, photoPath, listingTitle } = contractLocation(contract);
        const entries = ledgerByContract.get(contract.id) ?? [];
        const { nextPayment, isOverdue, outstandingCents } = derivePaymentPosture(entries);

        let paymentStatus: PaymentStatusKey = 'paid';
        if (isOverdue) paymentStatus = 'overdue';
        else if (nextPayment) paymentStatus = 'upcoming';

        const monthsLeft = deriveMonthsLeft(contract.end_date);
        const daysLeft = daysUntil(contract.end_date);
        const isEndingSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= ENDING_SOON_DAYS;

        return {
          contract,
          tenantName: contract.tenant?.full_name ?? 'Tenant unavailable',
          tenantEmail: contract.tenant?.email ?? null,
          isVerified: contract.tenant?.identity_verified ?? false,
          property,
          propertyCity: city,
          unit,
          listingPhotoPath: photoPath,
          listingTitle,
          nextPayment,
          paymentStatus,
          isOverdue,
          outstandingCents,
          monthsLeft,
          isEndingSoon,
        };
      });
  }, [contracts, ledgerByContract]);

  /* ── Awaiting-signature contracts ─────────────────────────────────────── */
  const awaitingSignature = useMemo(
    () => contracts.filter((c) => c.status === 'pending_tenant'),
    [contracts],
  );

  /* ── Distinct properties (for property filter dropdown) ────────────────── */
  const propertyOptions = useMemo<SelectOption<string>[]>(() => {
    const seen = new Map<string, string>();
    for (const t of activeTenancies) {
      if (!seen.has(t.property)) seen.set(t.property, t.property);
    }
    const opts: SelectOption<string>[] = [{ value: 'all', label: 'All properties' }];
    for (const [key, label] of seen) opts.push({ value: key, label });
    return opts;
  }, [activeTenancies]);

  /* ── KPI aggregates ───────────────────────────────────────────────────── */
  const rentRollCents = activeTenancies.reduce((sum, t) => sum + (t.contract.rent_amount ?? 0), 0);
  const overdueCount = activeTenancies.filter((t) => t.isOverdue).length;
  const overdueTotalCents = activeTenancies
    .filter((t) => t.isOverdue)
    .reduce((sum, t) => sum + t.outstandingCents, 0);
  const distinctPropertyCount = useMemo(
    () => new Set(activeTenancies.map((t) => t.property)).size,
    [activeTenancies],
  );

  /* ── Filter / sort pipeline ───────────────────────────────────────────── */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = [...activeTenancies];

    if (tab === 'active') {
      rows = rows.filter((t) => !t.isOverdue && !t.isEndingSoon);
    } else if (tab === 'awaiting_signature') {
      rows = [];
    } else if (tab === 'overdue') {
      rows = rows.filter((t) => t.isOverdue);
    } else if (tab === 'ending_soon') {
      rows = rows.filter((t) => t.isEndingSoon);
    }

    if (propertyFilter !== 'all') {
      rows = rows.filter((t) => t.property === propertyFilter);
    }

    if (q) {
      rows = rows.filter((t) => {
        const hay = [t.tenantName, t.property, t.unit ? `Unit ${t.unit}` : '', t.propertyCity]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return hay.includes(q);
      });
    }

    switch (sort) {
      case 'name_az':
        rows.sort((a, b) => a.tenantName.localeCompare(b.tenantName));
        break;
      case 'rent_high':
        rows.sort((a, b) => (b.contract.rent_amount ?? 0) - (a.contract.rent_amount ?? 0));
        break;
      case 'newest':
      default:
        rows.sort(
          (a, b) =>
            new Date(b.contract.created_at).getTime() - new Date(a.contract.created_at).getTime(),
        );
        break;
    }

    return rows;
  }, [activeTenancies, tab, propertyFilter, search, sort]);

  const slice = paginate(filtered, page, PER_PAGE);

  /* ── Filter tabs ──────────────────────────────────────────────────────── */
  const tabs: Tab<FilterKey>[] = [
    { key: 'all', label: 'All tenants', count: activeTenancies.length },
    {
      key: 'active',
      label: 'Active',
      count: activeTenancies.filter((t) => !t.isOverdue && !t.isEndingSoon).length,
      tone: 'success',
    },
    {
      key: 'awaiting_signature',
      label: 'Awaiting signature',
      count: awaitingSignature.length,
      tone: 'warning',
    },
    {
      key: 'overdue',
      label: 'Overdue',
      count: overdueCount,
      tone: 'danger',
    },
    {
      key: 'ending_soon',
      label: 'Ending soon',
      count: activeTenancies.filter((t) => t.isEndingSoon).length,
      tone: 'warning',
    },
  ];

  /* ── Gate states ──────────────────────────────────────────────────────── */
  const isLoading = contractsQ.loading || ledgerQ.loading;
  const primaryError = contractsQ.error ?? ledgerQ.error;

  /* ── Page header ──────────────────────────────────────────────────────── */
  const header = (
    <PageHeader
      eyebrow="Operations"
      title="Tenants"
      description="Manage active tenancies, contracts, and payment posture across your portfolio."
      action={
        <>
          <Link to="/app/ledger">
            <Button variant="secondary" size="sm" leftIcon={<IconLedger size={15} />}>
              View ledger
            </Button>
          </Link>
          <Link to="/app/contracts">
            <Button size="sm" leftIcon={<IconDoc size={15} />}>
              Create contract
            </Button>
          </Link>
        </>
      }
    />
  );

  if (!isLoading && primaryError?.status === 403) {
    return (
      <div className="animate-rise space-y-6">
        {header}
        <EmptyState
          icon={<IconUsers />}
          title="Access denied"
          description="You don't have permission to manage tenants."
        />
      </div>
    );
  }

  if (!isLoading && primaryError) {
    return (
      <div className="animate-rise space-y-6">
        {header}
        <ErrorState message={primaryError.message} onRetry={reload} />
      </div>
    );
  }

  /* ── Main render ──────────────────────────────────────────────────────── */
  return (
    <div className="animate-rise space-y-10">
      {header}

      {/* ── KPI row + featured overdue card ──────────────────────────────── */}
      <DashboardSection eyebrow="TENANCY OVERVIEW">
        <DataCardGrid cols={4}>
          <StatusCard
            label="Active tenants"
            value={activeTenancies.length}
            sub={`Across ${distinctPropertyCount} propert${distinctPropertyCount !== 1 ? 'ies' : 'y'}`}
            icon={<IconUsers size={18} />}
            role="neutral"
            loading={isLoading}
          />
          <StatusCard
            label="Monthly rent roll"
            value={formatCents(rentRollCents)}
            sub="Across active leases"
            role="info"
            icon={<IconWallet size={18} />}
            loading={isLoading}
          />
          <StatusCard
            label="Awaiting signature"
            value={awaitingSignature.length}
            sub={awaitingSignature.length > 0 ? 'Contracts sent to tenants' : 'None pending'}
            role={awaitingSignature.length > 0 ? 'warning' : 'neutral'}
            icon={<IconClock size={18} />}
            loading={isLoading}
          />
          <CommandCard
            label="Overdue accounts"
            value={overdueCount > 0 ? formatCents(overdueTotalCents) : 'All clear'}
            sub={
              overdueCount > 0
                ? `${overdueCount} account${overdueCount !== 1 ? 's' : ''} overdue`
                : 'All accounts current'
            }
            icon={overdueCount > 0 ? <IconAlertTriangle size={20} /> : <IconCheckCircle size={20} />}
            role={overdueCount > 0 ? 'danger' : 'success'}
            loading={isLoading}
          />
        </DataCardGrid>
      </DashboardSection>

      {/* ── Awaiting-signature banner ────────────────────────────────────── */}
      {!isLoading && awaitingSignature.length > 0 && (
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-warning-200 bg-warning-50 px-5 py-4">
          <div className="flex items-start gap-3">
            <IconClock size={18} className="mt-0.5 shrink-0 text-warning-600" />
            <p className="text-sm text-warning-800">
              <span className="font-semibold">
                {awaitingSignature.length} contract
                {awaitingSignature.length !== 1 ? 's' : ''}
              </span>{' '}
              awaiting signature — send reminders to help move contracts forward.
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setTab('awaiting_signature');
              resetPage();
            }}
          >
            View awaiting signature
          </Button>
        </div>
      )}

      {/* ── Command bar ─────────────────────────────────────────────────── */}
      <CommandBar>
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v);
            resetPage();
          }}
          placeholder="Search by tenant name, property or unit…"
          label="Search tenants"
        />
        <FilterTabs
          tabs={tabs}
          value={tab}
          onChange={(k) => {
            setTab(k);
            resetPage();
          }}
        />
        <SortSelect
          value={propertyFilter}
          onChange={(v) => {
            setPropertyFilter(v);
            resetPage();
          }}
          options={propertyOptions}
          label="Filter by property"
          prefix=""
        />
        <SortSelect
          value={sort}
          onChange={(v) => {
            setSort(v);
            resetPage();
          }}
          options={SORT_OPTIONS}
          label="Sort tenants"
          prefix="Sort: "
        />
      </CommandBar>

      {/* ── Main table ──────────────────────────────────────────────────── */}
      {isLoading ? (
        <LoadingState label="Loading tenancies…" />
      ) : activeTenancies.length === 0 ? (
        <EmptyState
          icon={<IconUsers />}
          title="No active tenants yet"
          description="Tenants appear here after a contract becomes active. Start by reviewing applicants."
          action={
            <Link to="/app/applicants">
              <Button>Review applicants</Button>
            </Link>
          }
        />
      ) : (
        <Card>
          <CardBody className="p-0">
            {tab === 'awaiting_signature' ? (
              /* ── Awaiting-signature sub-table ─────────────────────────── */
              awaitingSignature.length === 0 ? (
                <div className="px-5 py-12 text-center">
                  <p className="text-sm text-ink-500">No contracts awaiting signature.</p>
                </div>
              ) : (
                <Table>
                  <THead>
                    <TR>
                      <TH>Tenant</TH>
                      <TH>Property &amp; Unit</TH>
                      <TH>Monthly rent</TH>
                      <TH>Lease period</TH>
                      <TH className="text-right">Actions</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {awaitingSignature.map((c) => {
                      const { property, city, unit, photoPath, listingTitle } =
                        contractLocation(c);
                      return (
                        <TR key={c.id}>
                          <TD>
                            <div className="flex items-center gap-2.5">
                              <Initials name={c.tenant?.full_name ?? 'Tenant'} />
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-ink-900">
                                  {c.tenant?.full_name ?? 'Tenant unavailable'}
                                </p>
                                {c.tenant?.email && (
                                  <p className="truncate text-xs text-ink-500">{c.tenant.email}</p>
                                )}
                              </div>
                            </div>
                          </TD>
                          <TD>
                            <div className="flex items-center gap-2.5">
                              <Thumbnail
                                src={storageUrl(photoPath)}
                                alt={listingTitle ?? property}
                                seed={property}
                                size={36}
                              />
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-ink-900">
                                  {property}
                                </p>
                                <p className="truncate text-xs text-ink-500">
                                  {unit ? `Unit ${unit}` : '—'}
                                  {city ? ` · ${city}` : ''}
                                </p>
                              </div>
                            </div>
                          </TD>
                          <TD>
                            <span
                              className="text-sm font-semibold tabular-nums"
                              style={{ color: 'var(--color-money)' }}
                            >
                              {formatCents(c.rent_amount)}
                            </span>
                          </TD>
                          <TD className="text-sm text-ink-700">
                            {formatDate(c.start_date)} – {formatDate(c.end_date)}
                          </TD>
                          <TD className="text-right">
                            <Link to={`/app/contracts/${c.id}`}>
                              <Button variant="secondary" size="sm">
                                View contract
                              </Button>
                            </Link>
                          </TD>
                        </TR>
                      );
                    })}
                  </TBody>
                </Table>
              )
            ) : filtered.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <IconUsers size={32} className="mx-auto mb-3 text-ink-300" />
                <p className="text-sm font-medium text-ink-700">No tenants match</p>
                <p className="mt-1 text-xs text-ink-500">
                  Try a different filter, property, or search term.
                </p>
              </div>
            ) : (
              <>
                <Table>
                  <THead>
                    <TR>
                      <TH>Tenant</TH>
                      <TH>Property &amp; Unit</TH>
                      <TH>Lease period</TH>
                      <TH>Monthly rent</TH>
                      <TH>Next payment due</TH>
                      <TH>Payment status</TH>
                      <TH>Contract</TH>
                      <TH>Balance</TH>
                      <TH className="text-right">Actions</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {slice.items.map((t) => {
                      const daysLeft = daysUntil(t.contract.end_date);
                      const monthsLeftLabel =
                        daysLeft !== null && daysLeft >= 0
                          ? `${t.monthsLeft ?? 0} month${t.monthsLeft !== 1 ? 's' : ''} left`
                          : 'Expired';

                      const menuItems = [
                        {
                          label: 'View contract',
                          onClick: () => navigate(`/app/contracts/${t.contract.id}`),
                        },
                        {
                          label: 'Open ledger',
                          onClick: () => navigate('/app/ledger'),
                        },
                        {
                          label: 'Lease summary',
                          onClick: () => setLeaseTarget(t),
                        },
                      ];

                      return (
                        <TR key={t.contract.id}>
                          {/* Tenant */}
                          <TD>
                            <div className="flex items-center gap-2.5">
                              <Initials name={t.tenantName} />
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <p className="truncate text-sm font-medium text-ink-900">
                                    {t.tenantName}
                                  </p>
                                  {t.isVerified && (
                                    <SemanticBadge role="success" size="sm">Verified</SemanticBadge>
                                  )}
                                </div>
                                {t.tenantEmail && (
                                  <p className="truncate text-xs text-ink-500">{t.tenantEmail}</p>
                                )}
                              </div>
                            </div>
                          </TD>

                          {/* Property & Unit */}
                          <TD>
                            <div className="flex items-center gap-2.5">
                              <Thumbnail
                                src={storageUrl(t.listingPhotoPath)}
                                alt={t.listingTitle ?? t.property}
                                seed={t.property}
                                size={36}
                              />
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-ink-900">
                                  {t.property}
                                </p>
                                <p className="truncate text-xs text-ink-500">
                                  {t.unit ? `Unit ${t.unit}` : '—'}
                                  {t.propertyCity ? ` · ${t.propertyCity}` : ''}
                                </p>
                              </div>
                            </div>
                          </TD>

                          {/* Lease period */}
                          <TD>
                            <p className="text-sm text-ink-700">
                              {formatDate(t.contract.start_date)} –{' '}
                              {formatDate(t.contract.end_date)}
                            </p>
                            <p
                              className="text-xs"
                              style={{
                                color: t.isEndingSoon
                                  ? 'var(--color-warning-600)'
                                  : 'var(--color-ink-400)',
                              }}
                            >
                              {monthsLeftLabel}
                            </p>
                          </TD>

                          {/* Monthly rent */}
                          <TD>
                            <span
                              className="text-sm font-semibold tabular-nums"
                              style={{ color: 'var(--color-money)' }}
                            >
                              {formatCents(t.contract.rent_amount)}
                            </span>
                          </TD>

                          {/* Next payment due */}
                          <TD>
                            <NextPaymentCell nextPayment={t.nextPayment} />
                          </TD>

                          {/* Payment status */}
                          <TD>
                            <PaymentChip status={t.paymentStatus} />
                          </TD>

                          {/* Contract status */}
                          <TD>
                            <SemanticBadge role={getContractVariant(t.contract.status)}>
                              {humanize(t.contract.status)}
                            </SemanticBadge>
                          </TD>

                          {/* Balance */}
                          <TD>
                            <BalanceCell cents={t.outstandingCents} />
                          </TD>

                          {/* Actions */}
                          <TD className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Link to={`/app/contracts/${t.contract.id}`}>
                                <Button variant="secondary" size="sm">
                                  View profile
                                </Button>
                              </Link>
                              <Link to="/app/ledger">
                                <Button variant="ghost" size="sm">
                                  Open ledger
                                </Button>
                              </Link>
                              <ActionMenu items={menuItems} />
                            </div>
                          </TD>
                        </TR>
                      );
                    })}
                  </TBody>
                </Table>

                {/* Footer: range label + pagination */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-200 px-5 py-3">
                  <p className="text-xs text-ink-500">{rangeLabel(slice, 'tenant')}</p>
                  <Pagination slice={slice} onPage={setPage} />
                </div>
              </>
            )}
          </CardBody>
        </Card>
      )}

      {/* ── Lease detail modal (preserved from original) ─────────────────── */}
      <Modal
        open={leaseTarget !== null}
        onClose={() => setLeaseTarget(null)}
        title="Lease Summary"
        description={
          leaseTarget
            ? `${leaseTarget.tenantName} · ${leaseTarget.property}${
                leaseTarget.unit ? ` · Unit ${leaseTarget.unit}` : ''
              }`
            : undefined
        }
        size="sm"
        footer={
          leaseTarget && (
            <>
              <Button variant="secondary" onClick={() => setLeaseTarget(null)}>
                Close
              </Button>
              <Link to={`/app/contracts/${leaseTarget.contract.id}`}>
                <Button>View full lease</Button>
              </Link>
            </>
          )
        }
      >
        {leaseTarget && (
          <dl className="space-y-3 text-sm">
            <Row label="Tenant" value={leaseTarget.tenantName} />
            {leaseTarget.tenantEmail && <Row label="Email" value={leaseTarget.tenantEmail} />}
            <Row label="Property" value={leaseTarget.property} />
            {leaseTarget.unit && <Row label="Unit" value={`Unit ${leaseTarget.unit}`} />}
            <Row
              label="Monthly rent"
              value={formatCents(leaseTarget.contract.rent_amount)}
              money
            />
            <Row label="Payment day" value={`Day ${leaseTarget.contract.payment_day}`} />
            <Row label="Lease start" value={formatDate(leaseTarget.contract.start_date)} />
            <Row label="Lease end" value={formatDate(leaseTarget.contract.end_date)} />
            <Row
              label="Next payment"
              value={
                leaseTarget.nextPayment
                  ? `${formatCents(leaseTarget.nextPayment.amount_cents)}${
                      leaseTarget.nextPayment.due_date
                        ? ` · ${formatDate(leaseTarget.nextPayment.due_date)}`
                        : ''
                    }`
                  : 'All settled'
              }
            />
            <div className="flex items-start justify-between gap-2 pt-1">
              <dt className="text-ink-500">Payment status</dt>
              <dd>
                <PaymentChip status={leaseTarget.paymentStatus} />
              </dd>
            </div>
            {leaseTarget.outstandingCents > 0 && (
              <div className="flex items-center justify-between gap-2">
                <dt className="text-ink-500">Outstanding balance</dt>
                <dd>
                  <BalanceCell cents={leaseTarget.outstandingCents} />
                </dd>
              </div>
            )}
            <div className="flex items-center justify-between gap-2">
              <dt className="text-ink-500">Contract status</dt>
              <dd>
                <StatusChip tone={contractStatusTone(leaseTarget.contract.status)}>
                  {humanize(leaseTarget.contract.status)}
                </StatusChip>
              </dd>
            </div>
          </dl>
        )}
      </Modal>
    </div>
  );
}
