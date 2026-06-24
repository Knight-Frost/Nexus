import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useApi } from '@/hooks/useApi';
import { landlordApi } from '@/lib/endpoints';
import type { LedgerEntry, LedgerStatus, LedgerType } from '@/lib/types';
import {
  formatCents,
  formatDate,
  humanize,
} from '@/lib/format';
import {
  ledgerTypeLabel,
  ledgerIsCredit,
  ledgerSignedTone,
} from '@/lib/statusMaps';
import { paginate, rangeLabel } from '@/lib/paginate';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/Table';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import {
  CommandBar,
  SearchInput,
  FilterTabs,
  SortSelect,
  Pagination,
  ActionMenu,
  type FilterTab as Tab,
  type SelectOption,
} from '@/components/landlord/primitives';
import {
  IconWallet,
  IconAlertCircle,
  IconCalendar,
  IconDownload,
  IconFileText,
  IconCheckCircle,
  IconClock,
} from '@/components/ui/icons';
import { useToast } from '@/components/ui/toast';
import {
  StatusCard,
  CommandCard,
  SemanticBadge,
  DashboardSection,
  DataCardGrid,
  getCollectedVariant,
  getLedgerHealthVariant,
  getLedgerVariant,
} from '@/components/cards';

/* ---- Types ---------------------------------------------------------------- */

type StatusFilterKey = 'all' | LedgerStatus | 'fees';
type DateRange = 'this_month' | 'last_30' | 'all';
type SortKey = 'newest' | 'oldest' | 'amount_high';

const DATE_RANGE_OPTIONS: SelectOption<DateRange>[] = [
  { value: 'this_month', label: 'This month' },
  { value: 'last_30', label: 'Last 30 days' },
  { value: 'all', label: 'All time' },
];

const SORT_OPTIONS: SelectOption<SortKey>[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'amount_high', label: 'Amount high → low' },
];

const PER_PAGE = 12;

/* ---- Date helpers --------------------------------------------------------- */

function startOfMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function isThisMonth(iso: string | null): boolean {
  if (!iso) return false;
  return new Date(iso) >= startOfMonth();
}

function isLast30Days(iso: string | null): boolean {
  if (!iso) return false;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  return new Date(iso) >= cutoff;
}

function isWithinNextNDays(iso: string | null, n: number): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + n);
  return d >= now && d <= cutoff;
}

/* ---- KPI computation (single pass) --------------------------------------- */

interface KpiTotals {
  collectedThisMonth: number;
  outstanding: number;
  overdueTotal: number;
  overdueContractCount: number;
  upcomingWeek: number;
}

function computeKpis(entries: LedgerEntry[]): KpiTotals {
  let collectedThisMonth = 0;
  let outstanding = 0;
  let overdueTotal = 0;
  const overdueContracts = new Set<string>();
  let upcomingWeek = 0;

  for (const e of entries) {
    if (e.type === 'rent' && e.status === 'paid' && isThisMonth(e.due_date)) {
      collectedThisMonth += e.amount_cents;
    }
    if (e.status === 'pending') {
      outstanding += e.amount_cents;
    }
    if (e.status === 'overdue') {
      overdueTotal += e.amount_cents;
      overdueContracts.add(e.contract_id);
    }
    if (
      (e.status === 'pending' || e.status === 'overdue') &&
      (e.type === 'rent' || e.type === 'late_fee') &&
      isWithinNextNDays(e.due_date, 7)
    ) {
      upcomingWeek += e.amount_cents;
    }
  }

  return {
    collectedThisMonth,
    outstanding,
    overdueTotal,
    overdueContractCount: overdueContracts.size,
    upcomingWeek,
  };
}

/* ---- Entry type icon ------------------------------------------------------ */

function typeIcon(type: LedgerType) {
  switch (type) {
    case 'rent':
      return <IconCalendar size={13} />;
    case 'late_fee':
      return <IconAlertCircle size={13} />;
    case 'payment':
      return <IconCheckCircle size={13} />;
    case 'refund':
      return <IconFileText size={13} />;
  }
}

/* ---- Main component ------------------------------------------------------- */

export function LandlordLedger() {
  const { toast } = useToast();
  const { data, loading, error, reload } = useApi(() => landlordApi.ledger(), []);

  // Filters / sort / pagination
  const [search, setSearch] = useState('');
  const [statusTab, setStatusTab] = useState<StatusFilterKey>('all');
  const [propertyFilter, setPropertyFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [sort, setSort] = useState<SortKey>('newest');
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);

  // Detail modal
  const [viewing, setViewing] = useState<LedgerEntry | null>(null);

  const entries = useMemo(() => data ?? [], [data]);
  const hasAny = entries.length > 0;

  /* KPIs */
  const kpi = useMemo(() => computeKpis(entries), [entries]);

  /* Distinct properties for the property filter dropdown */
  const propertyOptions = useMemo<SelectOption<string>[]>(() => {
    const seen = new Map<string, string>(); // id → name
    for (const e of entries) {
      const prop = e.contract?.listing?.unit?.property;
      if (prop) seen.set(String(prop.id), prop.name);
    }
    const opts: SelectOption<string>[] = [{ value: 'all', label: 'All properties' }];
    for (const [id, name] of seen) opts.push({ value: id, label: name });
    return opts;
  }, [entries]);

  /* Status filter tab counts */
  const tabCounts = useMemo(() => {
    const c: Record<string, number> = { all: entries.length };
    for (const e of entries) {
      c[e.status] = (c[e.status] ?? 0) + 1;
      if (e.type === 'late_fee') c['fees'] = (c['fees'] ?? 0) + 1;
    }
    return c;
  }, [entries]);

  const tabs: Tab<StatusFilterKey>[] = [
    { key: 'all', label: 'All', count: tabCounts.all ?? 0 },
    { key: 'paid', label: 'Paid', count: tabCounts.paid ?? 0, tone: 'success' },
    { key: 'pending', label: 'Outstanding', count: tabCounts.pending ?? 0, tone: 'warning' },
    { key: 'overdue', label: 'Overdue', count: tabCounts.overdue ?? 0, tone: 'danger' },
    { key: 'fees', label: 'Fees', count: tabCounts.fees ?? 0, tone: 'danger' },
  ];

  /* Filtered + sorted entries */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    let rows = entries.filter((e) => {
      if (statusTab !== 'all') {
        if (statusTab === 'fees') {
          if (e.type !== 'late_fee') return false;
        } else {
          if (e.status !== statusTab) return false;
        }
      }

      if (propertyFilter !== 'all') {
        const prop = e.contract?.listing?.unit?.property;
        if (!prop || String(prop.id) !== propertyFilter) return false;
      }

      if (dateRange === 'this_month' && !isThisMonth(e.due_date)) return false;
      if (dateRange === 'last_30' && !isLast30Days(e.due_date)) return false;

      if (q) {
        const unit = e.contract?.listing?.unit;
        const prop = unit?.property;
        const hay = [
          e.tenant?.full_name,
          unit ? `unit ${unit.unit_number}` : null,
          prop?.name,
          e.reference,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }

      return true;
    });

    rows = [...rows].sort((a, b) => {
      switch (sort) {
        case 'oldest':
          return new Date(a.due_date ?? a.created_at).getTime() - new Date(b.due_date ?? b.created_at).getTime();
        case 'amount_high':
          return b.amount_cents - a.amount_cents;
        case 'newest':
        default:
          return new Date(b.due_date ?? b.created_at).getTime() - new Date(a.due_date ?? a.created_at).getTime();
      }
    });

    return rows;
  }, [entries, statusTab, propertyFilter, dateRange, search, sort]);

  const slice = paginate(filtered, page, PER_PAGE);

  function handleFilterChange(fn: () => void) {
    fn();
    setPage(1);
  }

  async function handleExport() {
    setExporting(true);
    try {
      await landlordApi.exportLedger();
      toast('Ledger exported', 'success');
    } catch {
      toast('Export failed', 'error');
    } finally {
      setExporting(false);
    }
  }

  // Semantic roles from real data
  const collectedRole = getCollectedVariant(kpi.collectedThisMonth, kpi.overdueTotal);
  const ledgerHealthRole = getLedgerHealthVariant(kpi.outstanding + kpi.overdueTotal, kpi.overdueTotal);

  return (
    <div className="animate-rise space-y-10">
      {/* Page header */}
      <PageHeader
        eyebrow="Operations"
        title="Rent Ledger"
        description="Track charges, payments, and balances across your contracts."
        action={
          <Button
            variant="secondary"
            leftIcon={<IconDownload size={16} />}
            onClick={handleExport}
            loading={exporting}
            disabled={!hasAny}
          >
            Export CSV
          </Button>
        }
      />

      {/* KPI row — CommandCard for overdue (most important), StatusCards for the rest */}
      <DashboardSection eyebrow="LEDGER SUMMARY">
        <DataCardGrid cols={4}>
          <StatusCard
            label="Collected this month"
            value={formatCents(kpi.collectedThisMonth)}
            sub="Rent paid in current calendar month"
            role={collectedRole}
            icon={<IconCheckCircle size={18} />}
            loading={loading}
          />
          <StatusCard
            label="Outstanding balance"
            value={formatCents(kpi.outstanding)}
            sub="Pending charges awaiting payment"
            role={kpi.outstanding > 0 ? 'warning' : 'neutral'}
            icon={<IconClock size={18} />}
            loading={loading}
          />
          <CommandCard
            label="Overdue amount"
            value={kpi.overdueTotal > 0 ? formatCents(kpi.overdueTotal) : 'All clear'}
            sub={
              kpi.overdueContractCount > 0
                ? `Across ${kpi.overdueContractCount} contract${kpi.overdueContractCount === 1 ? '' : 's'}`
                : 'Nothing overdue'
            }
            icon={<IconAlertCircle size={20} />}
            role={ledgerHealthRole}
            loading={loading}
          />
          <StatusCard
            label="Due this week"
            value={formatCents(kpi.upcomingWeek)}
            sub="Pending & overdue rent/fees, next 7 days"
            role={kpi.upcomingWeek > 0 ? 'warning' : 'neutral'}
            icon={<IconCalendar size={18} />}
            loading={loading}
          />
        </DataCardGrid>
      </DashboardSection>

      {/* Command bar */}
      <CommandBar>
        <SearchInput
          value={search}
          onChange={(v) => handleFilterChange(() => setSearch(v))}
          placeholder="Search by tenant, unit, property or reference…"
          label="Search ledger entries"
        />
        <FilterTabs
          tabs={tabs}
          value={statusTab}
          onChange={(k) => handleFilterChange(() => setStatusTab(k))}
        />
        <SortSelect
          value={propertyFilter}
          onChange={(v) => handleFilterChange(() => setPropertyFilter(v))}
          options={propertyOptions}
        />
        <SortSelect
          value={dateRange}
          onChange={(v) => handleFilterChange(() => setDateRange(v as DateRange))}
          options={DATE_RANGE_OPTIONS}
        />
        <SortSelect
          value={sort}
          onChange={(v) => setSort(v as SortKey)}
          options={SORT_OPTIONS}
        />
      </CommandBar>

      {/* Main content */}
      {loading ? (
        <LoadingState label="Loading ledger…" />
      ) : error ? (
        <ErrorState message={error.message} onRetry={reload} />
      ) : !hasAny ? (
        <EmptyState
          icon={<IconWallet />}
          title="No ledger activity yet"
          description="Charges and payments appear here once a contract is active."
          action={
            <Link to="/app/tenants">
              <Button variant="secondary">View tenants</Button>
            </Link>
          }
        />
      ) : slice.total === 0 ? (
        <EmptyState
          icon={<IconWallet />}
          title="No entries match"
          description="Try adjusting your search, filter, or date range."
        />
      ) : (
        <Card>
          <CardBody className="p-0">
            {/* Table header row */}
            <div className="flex items-center justify-between border-b border-ink-200 px-5 py-3">
              <p className="text-sm font-semibold text-ink-800">Ledger entries</p>
              <p className="text-xs text-ink-500">
                Showing {slice.from}–{slice.to} of {slice.total} {slice.total === 1 ? 'entry' : 'entries'}
              </p>
            </div>

            <Table>
              <THead>
                <TH>Date</TH>
                <TH>Tenant / Unit</TH>
                <TH>Entry type</TH>
                <TH>Reference</TH>
                <TH className="text-right">Amount</TH>
                <TH>Status</TH>
                <TH className="text-right">Balance after</TH>
                <TH />
              </THead>
              <TBody>
                {slice.items.map((entry) => {
                  const unit = entry.contract?.listing?.unit;
                  const prop = unit?.property;
                  const isCredit = ledgerIsCredit(entry.type);
                  const amountTone = ledgerSignedTone(entry.type);

                  const amountClass =
                    amountTone === 'success'
                      ? 'text-success-600'
                      : amountTone === 'info'
                        ? 'text-info-600'
                        : 'text-danger-700';

                  const menuItems = [
                    {
                      label: 'View details',
                      icon: <IconFileText size={15} />,
                      onClick: () => setViewing(entry),
                    },
                  ];

                  return (
                    <TR key={entry.id}>
                      {/* Date */}
                      <TD className="whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 text-sm text-ink-600">
                          <IconCalendar size={13} className="shrink-0 text-ink-400" />
                          {formatDate(entry.due_date ?? entry.created_at)}
                        </span>
                      </TD>

                      {/* Tenant / Unit */}
                      <TD>
                        <div className="min-w-[10rem]">
                          <p className="text-sm font-medium text-ink-900">
                            {entry.tenant?.full_name ?? '—'}
                          </p>
                          {unit && (
                            <p className="mt-0.5 text-xs text-ink-500">
                              Unit {unit.unit_number}
                              {prop ? ` · ${prop.name}` : ''}
                            </p>
                          )}
                        </div>
                      </TD>

                      {/* Entry type */}
                      <TD>
                        <span className="inline-flex items-center gap-1.5 text-sm text-ink-700">
                          <span className="text-ink-400">{typeIcon(entry.type)}</span>
                          {ledgerTypeLabel[entry.type]}
                        </span>
                      </TD>

                      {/* Reference */}
                      <TD>
                        <span className="font-mono text-xs text-ink-500">
                          {entry.reference ?? '—'}
                        </span>
                      </TD>

                      {/* Amount */}
                      <TD className="text-right">
                        <span className={`font-display text-sm font-semibold tabular-nums ${amountClass}`}>
                          {isCredit ? '-' : ''}
                          {formatCents(entry.amount_cents)}
                        </span>
                      </TD>

                      {/* Status — SemanticBadge from getLedgerVariant */}
                      <TD>
                        <SemanticBadge role={getLedgerVariant(entry.status)}>
                          {humanize(entry.status)}
                        </SemanticBadge>
                      </TD>

                      {/* Balance after entry */}
                      <TD className="text-right">
                        <span className="font-display text-sm tabular-nums text-ink-700">
                          {entry.balance_after_cents != null
                            ? formatCents(entry.balance_after_cents)
                            : '—'}
                        </span>
                      </TD>

                      {/* Actions */}
                      <TD className="text-right">
                        <ActionMenu items={menuItems} />
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>

            {/* Footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-200 px-5 py-3">
              <p className="text-xs text-ink-500">{rangeLabel(slice, 'entry', 'entries')}</p>
              <Pagination slice={slice} onPage={setPage} />
            </div>
          </CardBody>
        </Card>
      )}

      {/* Read-only entry detail modal */}
      <Modal
        open={viewing !== null}
        onClose={() => setViewing(null)}
        title="Ledger entry"
        size="md"
        footer={
          <Button variant="secondary" onClick={() => setViewing(null)}>
            Close
          </Button>
        }
      >
        {viewing && (() => {
          const e = viewing;
          const unit = e.contract?.listing?.unit;
          const prop = unit?.property;
          const isCredit = ledgerIsCredit(e.type);
          const amountTone = ledgerSignedTone(e.type);
          const amountClass =
            amountTone === 'success'
              ? 'text-success-600'
              : amountTone === 'info'
                ? 'text-info-600'
                : 'text-danger-700';

          return (
            <div className="space-y-5">
              {/* Type + status */}
              <div className="flex flex-wrap items-center gap-2">
                <SemanticBadge role={getLedgerVariant(e.status)}>
                  {humanize(e.status)}
                </SemanticBadge>
                <span className="inline-flex items-center gap-1 text-xs text-ink-500">
                  {typeIcon(e.type)}
                  {ledgerTypeLabel[e.type]}
                </span>
              </div>

              {/* Amount prominent */}
              <div className="rounded-xl bg-ink-50 px-4 py-4 text-center">
                <p className="text-xs font-medium uppercase tracking-widest text-ink-400">Amount</p>
                <p className={`font-display mt-1 text-3xl font-semibold tabular-nums ${amountClass}`}>
                  {isCredit ? '-' : ''}{formatCents(e.amount_cents)}
                </p>
              </div>

              {/* Detail grid */}
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                <div>
                  <dt className="text-xs text-ink-400">Reference</dt>
                  <dd className="mt-0.5 font-mono text-sm text-ink-800">{e.reference ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-400">Due date</dt>
                  <dd className="mt-0.5 text-sm text-ink-800">{formatDate(e.due_date ?? e.created_at)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-400">Tenant</dt>
                  <dd className="mt-0.5 text-sm font-medium text-ink-800">{e.tenant?.full_name ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-400">Unit / Property</dt>
                  <dd className="mt-0.5 text-sm text-ink-800">
                    {unit ? `Unit ${unit.unit_number}` : '—'}
                    {prop ? ` · ${prop.name}` : ''}
                  </dd>
                </div>
                {e.billing_period_start && (
                  <div className="col-span-2">
                    <dt className="text-xs text-ink-400">Billing period</dt>
                    <dd className="mt-0.5 text-sm text-ink-800">
                      {formatDate(e.billing_period_start)} – {formatDate(e.billing_period_end ?? e.billing_period_start)}
                    </dd>
                  </div>
                )}
                {e.balance_after_cents != null && (
                  <div className="col-span-2">
                    <dt className="text-xs text-ink-400">Contract balance after this entry</dt>
                    <dd className="mt-0.5 font-display text-sm font-semibold tabular-nums text-ink-900">
                      {formatCents(e.balance_after_cents)}
                    </dd>
                  </div>
                )}
              </dl>

              {/* Immutability note */}
              <p className="rounded-lg bg-ink-50 px-3 py-2 text-xs text-ink-500">
                Ledger entries are immutable. Corrections are handled via compensating entries.
              </p>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
