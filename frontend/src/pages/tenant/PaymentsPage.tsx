import { useState } from 'react';
import { useApi } from '@/hooks/useApi';
import { tenantApi } from '@/lib/endpoints';
import {
  formatCents,
  formatDate,
  daysUntil,
  humanize,
} from '@/lib/format';
import {
  EmptyState,
  ErrorState,
  ForbiddenState,
  LoadingState,
  SkeletonCard,
} from '@/components/ui/states';
import { Button } from '@/components/ui/Button';
import {
  CommandCard,
  StatusCard,
  SemanticBadge,
  DashboardSection,
  DataCardGrid,
  NexusCard,
  getPaymentBalanceVariant,
  getPaymentHealthVariant,
  getNextDueVariant,
  getLedgerVariant,
} from '@/components/cards';
import {
  IconWallet,
  IconCalendar,
  IconShield,
  IconCheckCircle,
  IconRefresh,
  IconChevronDown,
  IconInfo,
  IconClock,
} from '@/components/ui/icons';
import type { LedgerEntry, LedgerType } from '@/lib/types';
import './payments.css';

/* ---- Helpers --------------------------------------------------------------- */

function entryLabel(type: LedgerType, periodStart: string | null): string {
  switch (type) {
    case 'rent':     return 'Rent' + (periodStart ? ` – ${formatMonthYear(periodStart)}` : '');
    case 'late_fee': return 'Late fee';
    case 'payment':  return 'Payment received';
    case 'refund':   return 'Refund';
    default:         return humanize(type);
  }
}

function formatMonthYear(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GH', { month: 'long', year: 'numeric' });
}

function isPayable(entry: LedgerEntry): boolean {
  return (entry.type === 'rent' || entry.type === 'late_fee') &&
    (entry.status === 'pending' || entry.status === 'overdue');
}

/* ---- Pay state ------------------------------------------------------------ */

interface PayState {
  entryId: string;
  loading: boolean;
  done: boolean;
  error: string | null;
}

/* ---- Inline pay button ---------------------------------------------------- */

function PayButton({
  entry,
  payState,
  onPay,
}: {
  entry: LedgerEntry;
  payState: PayState | null;
  onPay: (entry: LedgerEntry) => void;
}) {
  if (!isPayable(entry)) return null;
  const mine = payState?.entryId === entry.id;

  if (mine && payState?.done) {
    return <span className="pm2-pay-note">Payment initiated</span>;
  }
  if (mine && payState?.error) {
    return <span className="pm2-pay-error">{payState.error}</span>;
  }

  return (
    <button
      className="pm2-btn-pay"
      disabled={mine && !!payState?.loading}
      onClick={() => onPay(entry)}
      type="button"
    >
      {mine && payState?.loading ? 'Initiating…' : 'Pay'}
    </button>
  );
}

/* ---- Skeletons ------------------------------------------------------------ */

function StatsSkeleton() {
  return (
    <DataCardGrid cols={4}>
      {[0, 1, 2, 3].map((i) => <SkeletonCard key={i} />)}
    </DataCardGrid>
  );
}

/* ============================================================================
   PaymentsPage
   ============================================================================ */

export function PaymentsPage() {
  const ledgerQ  = useApi(() => tenantApi.ledger(), []);
  const balanceQ = useApi(() => tenantApi.balance(), []);

  const [filter, setFilter]     = useState<'all' | 'rent' | 'fees'>('all');
  const [payState, setPayState] = useState<PayState | null>(null);

  function reload() { ledgerQ.reload(); balanceQ.reload(); }

  /* ---- Derived data -------------------------------------------------------- */
  const ledger  = ledgerQ.data ?? [];
  const balance = balanceQ.data;

  const filteredEntries = ledger.filter((e) => {
    if (filter === 'rent')  return e.type === 'rent';
    if (filter === 'fees')  return e.type === 'late_fee';
    return true;
  });

  /* Earliest pending/overdue entry with a due_date */
  const nextDue = ledger
    .filter((e) => (e.status === 'pending' || e.status === 'overdue') && e.due_date)
    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())[0] ?? null;

  const hasOverdue   = ledger.some((e) => e.status === 'overdue');
  /* Only count payment-type entries with status paid — truthful "confirmed" sum */
  const lifetimePaid = ledger
    .filter((e) => e.type === 'payment' && e.status === 'paid')
    .reduce((sum, e) => sum + e.amount_cents, 0);
  /* Only show lifetime-paid if we have any paid payment entries at all */
  const hasConfirmedPayments = ledger.some(
    (e) => e.type === 'payment' && e.status === 'paid',
  );

  const outstandingCents  = balance?.balance_cents ?? 0;
  const hasLedgerData     = ledger.length > 0;

  /* days until next due — null when no nextDue */
  const daysToNextDue = nextDue?.due_date ? daysUntil(nextDue.due_date) : null;

  /* Semantic roles — driven by real data, not ad-hoc conditionals */
  const balanceRole      = getPaymentBalanceVariant(outstandingCents, hasOverdue);
  const nextDueRole      = getNextDueVariant(daysToNextDue);
  const healthRole       = getPaymentHealthVariant(hasOverdue, hasLedgerData);

  /* ---- Pay action --------------------------------------------------------- */

  async function handlePay(entry: LedgerEntry) {
    setPayState({ entryId: entry.id, loading: true, done: false, error: null });
    try {
      await tenantApi.initiatePayment(entry.id);
      setPayState({ entryId: entry.id, loading: false, done: true, error: null });
    } catch {
      setPayState({
        entryId: entry.id,
        loading: false,
        done: false,
        error: 'Could not initiate payment. Try again or contact your landlord.',
      });
    }
  }

  /* ---- Error / forbidden gate --------------------------------------------- */

  const isLoading    = ledgerQ.loading || balanceQ.loading;
  const primaryError = ledgerQ.error ?? balanceQ.error;

  if (!isLoading && primaryError?.status === 403) {
    return (
      <div className="pm2-page">
        <PageHeader onRefresh={reload} />
        <ForbiddenState />
      </div>
    );
  }

  if (!isLoading && primaryError) {
    return (
      <div className="pm2-page">
        <PageHeader onRefresh={reload} />
        <ErrorState message={primaryError.message} onRetry={reload} />
      </div>
    );
  }

  /* ---- Render -------------------------------------------------------------- */

  return (
    <div className="pm2-page">
      <PageHeader onRefresh={reload} />

      {/* ── Summary cards ─────────────────────────────────────────────── */}
      {isLoading ? (
        <StatsSkeleton />
      ) : (
        <DataCardGrid cols={4}>
          {/* Outstanding balance — Level 3 command card (most important) */}
          <CommandCard
            label="Outstanding balance"
            value={formatCents(outstandingCents)}
            sub={
              outstandingCents <= 0
                ? 'All clear — nothing owed'
                : hasOverdue
                  ? 'Overdue charges present'
                  : 'Amount currently due'
            }
            icon={<IconWallet size={20} />}
            role={balanceRole}
            loading={isLoading}
          />

          {/* Next payment due */}
          <StatusCard
            label="Next payment due"
            value={nextDue ? formatCents(nextDue.amount_cents) : '—'}
            sub={
              nextDue
                ? daysToNextDue !== null
                  ? daysToNextDue < 0
                    ? `Overdue by ${Math.abs(daysToNextDue)} day${Math.abs(daysToNextDue) === 1 ? '' : 's'}`
                    : daysToNextDue === 0
                      ? 'Due today'
                      : `Due in ${daysToNextDue} day${daysToNextDue === 1 ? '' : 's'}`
                  : `Due ${formatDate(nextDue.due_date)}`
                : 'No upcoming charges'
            }
            icon={<IconCalendar size={18} />}
            role={nextDueRole}
            loading={isLoading}
          />

          {/* Payment health */}
          <StatusCard
            label="Payment health"
            value={
              !hasLedgerData
                ? 'No data yet'
                : hasOverdue
                  ? 'Overdue'
                  : 'On time'
            }
            sub={
              !hasLedgerData
                ? 'Ledger will appear once you have a lease'
                : hasOverdue
                  ? 'You have overdue charges'
                  : 'No overdue charges'
            }
            icon={<IconShield size={18} />}
            role={healthRole}
            loading={isLoading}
          />

          {/* Lifetime paid — only shown when real confirmed payments exist */}
          <StatusCard
            label="Lifetime paid"
            value={hasConfirmedPayments ? formatCents(lifetimePaid) : '—'}
            sub={
              hasConfirmedPayments
                ? 'Confirmed payment total'
                : 'No confirmed payments yet'
            }
            icon={<IconCheckCircle size={18} />}
            role={hasConfirmedPayments ? 'info' : 'neutral'}
            loading={isLoading}
          />
        </DataCardGrid>
      )}

      {/* ── Next-due action band ──────────────────────────────────────── */}
      {!isLoading && nextDue && (
        <NexusCard
          role={nextDueRole === 'neutral' ? 'neutral' : nextDueRole}
          className="pm2-next"
        >
          <div className="pm2-next-left">
            <span className="eyebrow">Next payment</span>
            <p className="pm2-next-label">
              {entryLabel(nextDue.type, nextDue.billing_period_start)}
            </p>
            {nextDue.due_date && (
              <p className="pm2-next-meta">
                <IconClock size={13} className="pm2-next-meta-icon" />
                Due {formatDate(nextDue.due_date)}
              </p>
            )}
          </div>
          <div className="pm2-next-right">
            <span className="pm2-next-amount font-display num-old">
              {formatCents(nextDue.amount_cents)}
            </span>
            {isPayable(nextDue) && (
              payState?.entryId === nextDue.id && payState.done ? (
                <p className="pm2-next-initiated">
                  Payment initiated. In-app card checkout is not yet available — your
                  landlord will confirm receipt once payment completes.
                </p>
              ) : (
                <button
                  className="pm2-btn-primary"
                  disabled={payState?.entryId === nextDue.id && !!payState?.loading}
                  onClick={() => handlePay(nextDue)}
                  type="button"
                >
                  {payState?.entryId === nextDue.id && payState?.loading
                    ? 'Initiating…'
                    : 'Pay now'}
                </button>
              )
            )}
          </div>
        </NexusCard>
      )}

      {/* ── Stripe notice — honest about card flow ────────────────────── */}
      {!isLoading && (
        <NexusCard role="info" className="pm2-notice">
          <IconInfo size={16} className="pm2-notice-icon" aria-hidden="true" />
          <p className="pm2-notice-text">
            <strong>Online card payment via Stripe is being set up.</strong>{' '}
            Pressing "Pay" initiates a payment intent; completing the card charge
            requires a payment flow that is not yet available in-app. Contact your
            landlord to arrange payment in the meantime.
          </p>
        </NexusCard>
      )}

      {/* ── Ledger table ─────────────────────────────────────────────── */}
      <DashboardSection
        eyebrow="Transaction history"
        title="Payment Ledger"
        description="All rent charges, fees, and payments on your account."
        action={
          <span className="pm2-select">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as typeof filter)}
              aria-label="Filter transactions"
            >
              <option value="all">All transactions</option>
              <option value="rent">Rent only</option>
              <option value="fees">Fees only</option>
            </select>
            <IconChevronDown size={14} className="pm2-select-chev" aria-hidden="true" />
          </span>
        }
      >
        <NexusCard role="neutral" className="pm2-ledger-card">
          {ledgerQ.loading ? (
            <LoadingState label="Loading ledger…" />
          ) : filteredEntries.length === 0 ? (
            <EmptyState
              icon={<IconWallet size={26} />}
              title="No payments yet"
              description="Once you have an active lease, your rent schedule and history appear here."
            />
          ) : (
            <div className="pm2-table-wrap">
              <table className="pm2-table">
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Description</th>
                    <th scope="col" className="pm2-hide-sm">Period</th>
                    <th scope="col" className="pm2-hide-md">Method</th>
                    <th scope="col">Status</th>
                    <th scope="col" className="r">Amount</th>
                    <th scope="col" aria-label="Actions"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.map((entry) => {
                    const isCredit = entry.type === 'payment' || entry.type === 'refund';
                    const entryRole = getLedgerVariant(entry.status);
                    return (
                      <tr key={entry.id}>
                        <td className="pm2-date">{formatDate(entry.created_at)}</td>
                        <td className="pm2-desc">
                          {entryLabel(entry.type, entry.billing_period_start)}
                        </td>
                        <td className="pm2-period pm2-hide-sm">
                          {entry.billing_period_start && entry.billing_period_end
                            ? `${formatDate(entry.billing_period_start)} – ${formatDate(entry.billing_period_end)}`
                            : '—'}
                        </td>
                        <td className="pm2-hide-md">
                          {entry.stripe_payment_intent_id ? (
                            <span className="pm2-method">
                              <span className="pm2-card-chip" aria-hidden="true">💳</span>
                              Card
                            </span>
                          ) : '—'}
                        </td>
                        <td>
                          <SemanticBadge role={entryRole} status={entry.status} />
                        </td>
                        <td className={`r pm2-amount${isCredit ? ' credit' : ''}`}>
                          {isCredit ? '–' : ''}{formatCents(entry.amount_cents)}
                        </td>
                        <td className="pm2-action-col">
                          <PayButton entry={entry} payState={payState} onPay={handlePay} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </NexusCard>
      </DashboardSection>
    </div>
  );
}

/* ---- Page header ---------------------------------------------------------- */

function PageHeader({ onRefresh }: { onRefresh: () => void }) {
  return (
    <div className="pm2-header">
      <div>
        <span className="eyebrow">My Rental</span>
        <h1 className="pm2-title">Payments</h1>
        <p className="pm2-sub">Track rent, charges, and your payment history.</p>
      </div>
      <div className="pm2-head-actions">
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<IconRefresh size={15} />}
          onClick={onRefresh}
          aria-label="Refresh payments data"
        >
          Refresh
        </Button>
      </div>
    </div>
  );
}
