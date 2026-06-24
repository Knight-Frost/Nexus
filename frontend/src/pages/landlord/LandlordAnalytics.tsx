import { useMemo } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Bars } from '@/components/ui/charts';
import {
  EmptyState,
  ErrorState,
  ForbiddenState,
  LoadingState,
} from '@/components/ui/states';
import {
  IconWallet,
  IconCheckCircle,
  IconAlertTriangle,
  IconBarChart,
  IconUsers,
  IconClock,
  IconRefresh,
  IconScale,
} from '@/components/ui/icons';
import { useApi } from '@/hooks/useApi';
import { landlordApi } from '@/lib/endpoints';
import { humanize } from '@/lib/format';
import type { ContractStatus } from '@/lib/types';
import {
  StatusCard,
  NexusCard,
  SemanticBadge,
  DashboardSection,
  DataCardGrid,
  getContractVariant,
  getLedgerHealthVariant,
} from '@/components/cards';

/* ----------------------------------------------------------------------------
 * Real payload shapes — mirror App\Services\Analytics\{Financial,Contract}.
 *
 * why: FinancialAnalyticsService divides every `amount_cents` SUM by 100, so the
 * numbers it returns are already in WHOLE CEDIS (not cents). We therefore format
 * them with a local cedi formatter and do NOT call formatCents().
 * -------------------------------------------------------------------------- */

interface FinancialAnalytics {
  revenue?: {
    total_rent_generated?: number;
    total_payments_received?: number;
    total_waived?: number;
    net_revenue?: number;
    revenue_by_month?: Record<string, number>;
    revenue_by_property?: Record<string, number>;
  };
  outstanding?: {
    total_outstanding_balance?: number;
    total_overdue_amount?: number;
    overdue_rate_percentage?: number;
    tenants_with_overdue_balance?: number;
    average_days_overdue?: number;
  };
  ledger_integrity?: {
    ledger_balance_sum?: number;
    negative_balances_count?: number;
    orphan_ledger_entries?: number;
    balance_mismatch_detected?: boolean;
  };
}

interface ContractAnalytics {
  total_contracts?: number;
  active_contracts?: number;
  terminated_contracts?: number;
  expired_contracts?: number;
  contracts_by_status?: Record<string, number>;
  average_contract_duration_days?: number;
  early_termination_rate?: number;
  renewal_rate?: number;
}

/* ---- Formatting ----------------------------------------------------------- */

const CEDI_FMT = new Intl.NumberFormat('en-GH', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Whole-cedi values from the financial service (already divided by 100). */
function formatCedis(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value)) return '—';
  return 'GH₵ ' + CEDI_FMT.format(value);
}

function formatPercent(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value)) return '—';
  return `${value.toFixed(1)}%`;
}

function formatNumber(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value)) return '—';
  return value.toLocaleString('en-GH');
}

/** Month key ("2026-06") → "Jun '26" for axis captions. */
function monthLabel(key: string): string {
  const d = new Date(`${key}-01T00:00:00`);
  return Number.isNaN(d.getTime())
    ? key
    : d.toLocaleDateString('en-GH', { month: 'short', year: '2-digit' });
}

/* ---- Page ----------------------------------------------------------------- */

export function LandlordAnalytics() {
  const financialQ = useApi(() => landlordApi.analyticsFinancial(), []);
  const contractsQ = useApi(() => landlordApi.analyticsContracts(), []);

  function reload() {
    financialQ.reload();
    contractsQ.reload();
  }

  const financial = (financialQ.data?.analytics as FinancialAnalytics | undefined) ?? undefined;
  const contracts = (contractsQ.data?.analytics as ContractAnalytics | undefined) ?? undefined;

  const revenue = financial?.revenue;
  const outstanding = financial?.outstanding;
  const integrity = financial?.ledger_integrity;

  const monthSeries = useMemo(() => {
    const map = revenue?.revenue_by_month ?? {};
    return Object.keys(map)
      .sort()
      .map((key) => ({ key, label: monthLabel(key), value: map[key] }));
  }, [revenue?.revenue_by_month]);

  const propertySeries = useMemo(() => {
    const map = revenue?.revenue_by_property ?? {};
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [revenue?.revenue_by_property]);

  const statusEntries = useMemo(() => {
    const map = contracts?.contracts_by_status ?? {};
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [contracts?.contracts_by_status]);

  /* ---- Gates -------------------------------------------------------------- */
  const isLoading = financialQ.loading || contractsQ.loading;
  const primaryError = financialQ.error ?? contractsQ.error;

  const header = (
    <PageHeader
      eyebrow="Insights"
      title="Analytics"
      description="Financial and contract performance across your portfolio. Scoped to your properties."
      action={
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<IconRefresh size={15} />}
          onClick={reload}
        >
          Refresh
        </Button>
      }
    />
  );

  if (!isLoading && primaryError?.status === 403) {
    return (
      <div className="animate-rise space-y-10">
        {header}
        <ForbiddenState message="You don't have access to analytics." />
      </div>
    );
  }

  if (!isLoading && primaryError) {
    return (
      <div className="animate-rise space-y-10">
        {header}
        <ErrorState message={primaryError.message} onRetry={reload} />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="animate-rise space-y-10">
        {header}
        <LoadingState label="Crunching your portfolio numbers…" />
      </div>
    );
  }

  // Honest empty state: nothing meaningful has accrued yet.
  const hasFinancial =
    (revenue?.total_rent_generated ?? 0) > 0 ||
    (revenue?.total_payments_received ?? 0) > 0 ||
    (outstanding?.total_outstanding_balance ?? 0) > 0;
  const hasContracts = (contracts?.total_contracts ?? 0) > 0;

  if (!hasFinancial && !hasContracts) {
    return (
      <div className="animate-rise space-y-10">
        {header}
        <EmptyState
          icon={<IconBarChart />}
          title="Analytics will populate as your portfolio grows"
          description="Once you have active contracts and rent flowing through the ledger, your revenue, outstanding balances, and contract trends appear here."
        />
      </div>
    );
  }

  /* Semantic roles from real values */
  const overdueAmt = outstanding?.total_overdue_amount ?? 0;
  const outstandingAmt = outstanding?.total_outstanding_balance ?? 0;
  const overdueRole = getLedgerHealthVariant(outstandingAmt, overdueAmt);

  return (
    <div className="animate-rise space-y-10">
      {header}

      {/* ---- Financial KPIs ---- */}
      {hasFinancial && (
        <DashboardSection eyebrow="FINANCIAL OVERVIEW">
          <DataCardGrid cols={4}>
            <StatusCard
              label="Payments Received"
              value={formatCedis(revenue?.total_payments_received)}
              sub="rent collected"
              role={(revenue?.total_payments_received ?? 0) > 0 ? 'success' : 'neutral'}
              icon={<IconCheckCircle size={18} />}
            />
            <StatusCard
              label="Rent Generated"
              value={formatCedis(revenue?.total_rent_generated)}
              sub="billed to date"
              role="info"
              icon={<IconBarChart size={18} />}
            />
            <StatusCard
              label="Outstanding"
              value={formatCedis(outstandingAmt)}
              sub="pending payment"
              role={outstandingAmt > 0 ? 'warning' : 'success'}
              icon={<IconWallet size={18} />}
            />
            <StatusCard
              label="Overdue"
              value={formatCedis(overdueAmt)}
              sub={
                outstanding?.overdue_rate_percentage !== undefined
                  ? `${formatPercent(outstanding.overdue_rate_percentage)} of rent`
                  : 'past due'
              }
              role={overdueRole}
              icon={<IconAlertTriangle size={18} />}
            />
          </DataCardGrid>
        </DashboardSection>
      )}

      {/* ---- Revenue by month ---- */}
      {monthSeries.length > 0 && (
        <NexusCard role="neutral" className="overflow-hidden">
          <div className="border-b border-ink-100 px-6 py-4">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-ink-400">
              Revenue trend
            </p>
            <p className="mt-0.5 font-display text-base font-semibold text-ink-900">
              Revenue by Month
            </p>
            <p className="mt-0.5 text-sm text-ink-500">Rent payments received, grouped by month.</p>
          </div>
          <div className="px-6 py-5">
            <Bars
              data={monthSeries.map((m) => m.value)}
              color="var(--color-money)"
              height={72}
            />
            <div className="mt-3 flex flex-wrap justify-between gap-2">
              {monthSeries.map((m) => (
                <div key={m.key} className="min-w-0 text-center">
                  <p className="text-xs font-medium text-ink-700">{formatCedis(m.value)}</p>
                  <p className="text-[11px] text-ink-500">{m.label}</p>
                </div>
              ))}
            </div>
          </div>
        </NexusCard>
      )}

      {/* ---- Revenue by property ---- */}
      {propertySeries.length > 0 && (
        <NexusCard role="neutral" className="overflow-hidden">
          <div className="border-b border-ink-100 px-6 py-4">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-ink-400">
              Portfolio breakdown
            </p>
            <p className="mt-0.5 font-display text-base font-semibold text-ink-900">
              Revenue by Property
            </p>
            <p className="mt-0.5 text-sm text-ink-500">
              Rent collected per property in your portfolio.
            </p>
          </div>
          <div className="space-y-3 px-6 py-5">
            {propertySeries.map((p) => {
              const max = propertySeries[0].value || 1;
              const pct = Math.max(2, Math.round((p.value / max) * 100));
              return (
                <div key={p.name}>
                  <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                    <span className="truncate text-ink-800">{p.name}</span>
                    <span className="shrink-0 font-medium text-success-700">
                      {formatCedis(p.value)}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-ink-100">
                    <div
                      className="h-full rounded-full bg-success-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </NexusCard>
      )}

      {/* ---- Contract KPIs ---- */}
      {hasContracts && (
        <DashboardSection eyebrow="CONTRACT PERFORMANCE">
          <DataCardGrid cols={4}>
            <StatusCard
              label="Active Contracts"
              value={formatNumber(contracts?.active_contracts)}
              sub={`of ${formatNumber(contracts?.total_contracts)} total`}
              role={(contracts?.active_contracts ?? 0) > 0 ? 'success' : 'neutral'}
              icon={<IconUsers size={18} />}
            />
            <StatusCard
              label="Avg. Duration"
              value={
                contracts?.average_contract_duration_days !== undefined
                  ? `${formatNumber(Math.round(contracts.average_contract_duration_days))} days`
                  : '—'
              }
              sub="per contract"
              role="neutral"
              icon={<IconClock size={18} />}
            />
            <StatusCard
              label="Early Termination"
              value={formatPercent(contracts?.early_termination_rate)}
              sub="of contracts"
              role={(contracts?.early_termination_rate ?? 0) > 0 ? 'warning' : 'neutral'}
              icon={<IconAlertTriangle size={18} />}
            />
            <StatusCard
              label="Renewal Rate"
              value={formatPercent(contracts?.renewal_rate)}
              sub="tenants renewed"
              role={(contracts?.renewal_rate ?? 0) > 0 ? 'info' : 'neutral'}
              icon={<IconScale size={18} />}
            />
          </DataCardGrid>

          {/* Contracts by status breakdown */}
          {statusEntries.length > 0 && (
            <NexusCard role="neutral" className="mt-6 overflow-hidden">
              <div className="border-b border-ink-100 px-6 py-4">
                <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-ink-400">
                  Lifecycle
                </p>
                <p className="mt-0.5 font-display text-base font-semibold text-ink-900">
                  Contracts by Status
                </p>
                <p className="mt-0.5 text-sm text-ink-500">
                  Distribution of your contracts across their lifecycle.
                </p>
              </div>
              <div className="flex flex-wrap gap-x-8 gap-y-5 px-6 py-5">
                {statusEntries.map(([status, count]) => (
                  <div key={status} className="flex items-center gap-3">
                    <span className="font-display text-2xl font-semibold text-ink-950">
                      {formatNumber(count)}
                    </span>
                    <SemanticBadge role={getContractVariant(status as ContractStatus)}>
                      {humanize(status)}
                    </SemanticBadge>
                  </div>
                ))}
              </div>
            </NexusCard>
          )}
        </DashboardSection>
      )}

      {/* ---- Ledger integrity (audit signal) ---- */}
      {integrity && (
        <NexusCard role="neutral" className="overflow-hidden">
          <div className="border-b border-ink-100 px-6 py-4">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-ink-400">
              Audit signals
            </p>
            <p className="mt-0.5 font-display text-base font-semibold text-ink-900">
              Ledger Integrity
            </p>
            <p className="mt-0.5 text-sm text-ink-500">
              Financial record health checks on your portfolio.
            </p>
          </div>
          <div className="px-6 py-5">
            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-3">
              <IntegrityRow
                label="Ledger balance"
                value={formatCedis(integrity.ledger_balance_sum)}
              />
              <IntegrityRow
                label="Negative balances"
                value={formatNumber(integrity.negative_balances_count)}
                bad={(integrity.negative_balances_count ?? 0) > 0}
              />
              <IntegrityRow
                label="Orphan entries"
                value={formatNumber(integrity.orphan_ledger_entries)}
                bad={(integrity.orphan_ledger_entries ?? 0) > 0}
              />
              <div className="sm:col-span-3">
                {integrity.balance_mismatch_detected ? (
                  <SemanticBadge role="danger">Balance mismatch detected</SemanticBadge>
                ) : (
                  <SemanticBadge role="success">Books balanced</SemanticBadge>
                )}
              </div>
            </dl>
          </div>
        </NexusCard>
      )}
    </div>
  );
}

/* ---- Integrity row helper ------------------------------------------------- */

function IntegrityRow({
  label,
  value,
  bad,
}: {
  label: string;
  value: string;
  bad?: boolean;
}) {
  return (
    <div>
      <dt className="text-sm text-ink-500">{label}</dt>
      <dd
        className={`mt-0.5 font-display text-xl font-semibold ${
          bad ? 'text-danger-600' : 'text-ink-950'
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
