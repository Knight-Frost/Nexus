import { useState } from 'react';
import { useAuth } from '@/context/auth';
import { useApi } from '@/hooks/useApi';
import { adminApi, landlordApi, tenantApi } from '@/lib/endpoints';
import { formatCents, formatDate, humanize, ledgerStatusTone } from '@/lib/format';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardBody } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/Table';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import {
  IconChevronRight,
  IconLedger,
  IconCheckCircle,
  IconAlertCircle,
  IconClock,
} from '@/components/ui/icons';
import { cn } from '@/lib/cn';
import type { LedgerEntry, LedgerStatus } from '@/lib/types';

function isPayable(entry: LedgerEntry): boolean {
  return (
    (entry.type === 'rent' || entry.type === 'late_fee') &&
    (entry.status === 'pending' || entry.status === 'overdue')
  );
}

function computeSummary(entries: LedgerEntry[]) {
  let collected = 0;
  let pending = 0;
  let overdue = 0;
  for (const e of entries) {
    if (e.status === 'paid') collected += e.amount_cents;
    else if (e.status === 'pending') pending += e.amount_cents;
    else if (e.status === 'overdue') overdue += e.amount_cents;
  }
  return { collected, pending, overdue };
}

type FilterTab = 'all' | LedgerStatus;

const STATUS_TABS: { value: FilterTab; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'paid', label: 'Paid' },
  { value: 'waived', label: 'Waived' },
];

export function LedgerPage() {
  const { user } = useAuth();
  const role = user?.role;

  const [page, setPage] = useState(1);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [paidIds, setPaidIds] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [payResult, setPayResult] = useState<{ id: string; success: boolean } | null>(null);

  const ledger = useApi<{ entries: LedgerEntry[]; currentPage: number; lastPage: number }>(
    async () => {
      if (role === 'tenant') {
        const entries = await tenantApi.ledger();
        return { entries, currentPage: 1, lastPage: 1 };
      }
      if (role === 'landlord') {
        const entries = await landlordApi.ledger();
        return { entries, currentPage: 1, lastPage: 1 };
      }
      if (role === 'admin') {
        const res = await adminApi.ledger({ page });
        return { entries: res.data, currentPage: res.current_page, lastPage: res.last_page };
      }
      return { entries: [], currentPage: 1, lastPage: 1 };
    },
    [role, page],
  );

  const balance = useApi(
    () => (role === 'tenant' ? tenantApi.balance() : Promise.resolve(null)),
    [role],
  );

  async function pay(entry: LedgerEntry) {
    setPayingId(entry.id);
    setPayResult(null);
    try {
      await tenantApi.initiatePayment(entry.id);
      setPaidIds((prev) => new Set([...prev, entry.id]));
      setPayResult({ id: entry.id, success: true });
    } catch {
      setPayResult({ id: entry.id, success: false });
    } finally {
      setPayingId(null);
    }
  }

  const title =
    role === 'tenant' ? 'Payments' :
    role === 'admin' ? 'Ledger' :
    'Rent Ledger';

  const description =
    role === 'tenant'
      ? 'Your rent charges, fees, and payment history.'
      : role === 'landlord'
        ? 'All rent entries and fees across your contracts.'
        : 'Platform-wide rent entries, fees, and payments.';

  const allEntries = ledger.data?.entries ?? [];
  const summary = computeSummary(allEntries);
  const isTenant = role === 'tenant';

  const filtered =
    activeFilter === 'all'
      ? allEntries
      : allEntries.filter((e) => e.status === activeFilter);

  return (
    <div className="animate-rise space-y-6">
      <PageHeader
        eyebrow={role === 'admin' ? 'Governance' : role === 'landlord' ? 'Operations' : 'My Rental'}
        title={title}
        description={description}
      />

      {/* Summary stat cards */}
      {allEntries.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label={isTenant ? 'Total paid' : 'Total collected'}
            value={formatCents(summary.collected)}
            tone="success"
            icon={<IconCheckCircle className="h-[18px] w-[18px]" />}
            hint="Paid entries"
          />
          <StatCard
            label="Pending"
            value={formatCents(summary.pending)}
            tone="warning"
            icon={<IconClock className="h-[18px] w-[18px]" />}
            hint="Due but not yet paid"
          />
          <StatCard
            label="Overdue"
            value={formatCents(summary.overdue)}
            tone={summary.overdue > 0 ? 'danger' : 'success'}
            icon={<IconAlertCircle className="h-[18px] w-[18px]" />}
            hint={summary.overdue > 0 ? 'Requires attention' : 'Nothing overdue'}
          />
        </div>
      )}

      {/* Tenant outstanding balance */}
      {isTenant && balance.data && (balance.data.balance_cents ?? 0) > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-warning-200 bg-warning-50 px-4 py-3 text-sm">
          <IconAlertCircle size={16} className="shrink-0 text-warning-600" />
          <span className="font-medium text-warning-800">
            Outstanding balance:{' '}
            <span style={{ color: 'var(--color-money)' }} className="font-semibold">
              {formatCents(balance.data.balance_cents)}
            </span>
          </span>
        </div>
      )}

      {/* Pay result banner */}
      {payResult && (
        <div
          className={cn(
            'flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium border',
            payResult.success
              ? 'bg-success-50 text-success-700 border-success-200'
              : 'bg-danger-50 text-danger-700 border-danger-200',
          )}
        >
          {payResult.success ? (
            <IconCheckCircle size={15} className="shrink-0" />
          ) : (
            <IconAlertCircle size={15} className="shrink-0" />
          )}
          {payResult.success
            ? 'Payment initiated — it will be reflected shortly.'
            : 'Payment could not be initiated. Please try again.'}
        </div>
      )}

      {ledger.loading ? (
        <LoadingState />
      ) : ledger.error ? (
        <ErrorState message={ledger.error.message} onRetry={ledger.reload} />
      ) : allEntries.length === 0 ? (
        <EmptyState
          icon={<IconLedger />}
          title="No ledger entries"
          description="Charges and payments will appear here once a contract is active."
        />
      ) : (
        <>
          {/* Filter tabs */}
          <div className="flex gap-1 overflow-x-auto rounded-xl bg-ink-100 border border-ink-200 p-1 w-fit">
            {STATUS_TABS.map(({ value, label }) => {
              const count = value === 'all' ? allEntries.length : allEntries.filter((e) => e.status === value).length;
              if (value !== 'all' && count === 0) return null;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setActiveFilter(value)}
                  className={cn(
                    'flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition',
                    activeFilter === value
                      ? 'bg-surface text-ink-900 shadow-sm'
                      : 'text-ink-500 hover:text-ink-700',
                  )}
                >
                  {label}
                  {count > 0 && (
                    <span
                      className={cn(
                        'rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none',
                        activeFilter === value
                          ? 'bg-brand-100 text-brand-700'
                          : 'bg-ink-200 text-ink-500',
                      )}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={<IconLedger />}
              title={`No ${activeFilter} entries`}
              description="Try a different filter."
            />
          ) : (
            <Card>
              <CardBody className="p-0">
                <Table>
                  <THead>
                    <TH>Date</TH>
                    <TH>Type</TH>
                    <TH>Period</TH>
                    <TH>Amount</TH>
                    <TH>Status</TH>
                    {isTenant && <TH />}
                  </THead>
                  <TBody>
                    {filtered.map((entry) => {
                      const alreadyPaid = paidIds.has(entry.id);
                      return (
                        <TR key={entry.id}>
                          <TD className="whitespace-nowrap text-ink-600 text-sm">
                            {formatDate(entry.due_date ?? entry.created_at)}
                          </TD>
                          <TD className="font-medium text-ink-900">{humanize(entry.type)}</TD>
                          <TD className="whitespace-nowrap text-ink-600 text-sm">
                            {entry.billing_period_start || entry.billing_period_end
                              ? `${formatDate(entry.billing_period_start)} – ${formatDate(entry.billing_period_end)}`
                              : '—'}
                          </TD>
                          <TD className="font-semibold">
                            <span style={{ color: 'var(--color-money)' }}>
                              {formatCents(entry.amount_cents)}
                            </span>
                          </TD>
                          <TD>
                            <Badge tone={ledgerStatusTone(alreadyPaid ? 'paid' : entry.status)}>
                              {humanize(alreadyPaid ? 'paid' : entry.status)}
                            </Badge>
                          </TD>
                          {isTenant && (
                            <TD className="text-right">
                              {isPayable(entry) && !alreadyPaid ? (
                                <Button
                                  size="sm"
                                  onClick={() => pay(entry)}
                                  loading={payingId === entry.id}
                                  disabled={payingId !== null}
                                >
                                  Pay Now
                                </Button>
                              ) : alreadyPaid ? (
                                <span className="text-xs text-success-600 font-medium">Initiated</span>
                              ) : null}
                            </TD>
                          )}
                        </TR>
                      );
                    })}
                  </TBody>
                </Table>
              </CardBody>
            </Card>
          )}

          {(ledger.data?.lastPage ?? 1) > 1 && (
            <div className="mt-6 flex items-center justify-center gap-4">
              <Button
                variant="secondary"
                size="sm"
                disabled={(ledger.data?.currentPage ?? 1) <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <span className="text-sm text-ink-500">
                Page {ledger.data?.currentPage ?? 1} of {ledger.data?.lastPage ?? 1}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={(ledger.data?.currentPage ?? 1) >= (ledger.data?.lastPage ?? 1)}
                onClick={() => setPage((p) => p + 1)}
                leftIcon={<IconChevronRight className="h-4 w-4" />}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
