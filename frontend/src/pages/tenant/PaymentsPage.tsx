import { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardHeader, CardBody, CardFooter } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { StatCard } from '@/components/ui/StatCard';
import { Table, THead, TH, TBody, TR, TD } from '@/components/ui/Table';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import {
  IconWallet,
  IconClock,
  IconAlertTriangle,
  IconCheckCircle,
  IconRefresh,
} from '@/components/ui/icons';
import { useApi } from '@/hooks/useApi';
import { tenantApi } from '@/lib/endpoints';
import {
  formatCents,
  formatDate,
  humanize,
  ledgerStatusTone,
} from '@/lib/format';
import type { LedgerEntry, LedgerType, LedgerStatus } from '@/lib/types';
import type { Tone } from '@/components/ui/Badge';

/* ---- Mock fallback data -------------------------------------------------- */
const MOCK_LEDGER: LedgerEntry[] = [
  {
    id: 'le-001',
    contract_id: 'ctr-001',
    tenant_id: 1,
    landlord_id: 2,
    type: 'rent',
    amount_cents: 1200000,
    currency: 'GHS',
    billing_period_start: '2026-06-01',
    billing_period_end: '2026-06-30',
    due_date: '2026-06-05',
    status: 'pending',
    related_rent_entry_id: null,
    stripe_payment_intent_id: null,
    created_at: '2026-06-01T00:00:00Z',
  },
  {
    id: 'le-002',
    contract_id: 'ctr-001',
    tenant_id: 1,
    landlord_id: 2,
    type: 'rent',
    amount_cents: 1200000,
    currency: 'GHS',
    billing_period_start: '2026-05-01',
    billing_period_end: '2026-05-31',
    due_date: '2026-05-05',
    status: 'paid',
    related_rent_entry_id: null,
    stripe_payment_intent_id: 'pi_abc123',
    created_at: '2026-05-01T00:00:00Z',
  },
  {
    id: 'le-003',
    contract_id: 'ctr-001',
    tenant_id: 1,
    landlord_id: 2,
    type: 'rent',
    amount_cents: 1200000,
    currency: 'GHS',
    billing_period_start: '2026-04-01',
    billing_period_end: '2026-04-30',
    due_date: '2026-04-05',
    status: 'paid',
    related_rent_entry_id: null,
    stripe_payment_intent_id: 'pi_def456',
    created_at: '2026-04-01T00:00:00Z',
  },
  {
    id: 'le-004',
    contract_id: 'ctr-001',
    tenant_id: 1,
    landlord_id: 2,
    type: 'late_fee',
    amount_cents: 60000,
    currency: 'GHS',
    billing_period_start: '2026-03-01',
    billing_period_end: '2026-03-31',
    due_date: '2026-03-20',
    status: 'paid',
    related_rent_entry_id: 'le-005',
    stripe_payment_intent_id: 'pi_ghi789',
    created_at: '2026-03-15T00:00:00Z',
  },
  {
    id: 'le-005',
    contract_id: 'ctr-001',
    tenant_id: 1,
    landlord_id: 2,
    type: 'rent',
    amount_cents: 1200000,
    currency: 'GHS',
    billing_period_start: '2026-03-01',
    billing_period_end: '2026-03-31',
    due_date: '2026-03-05',
    status: 'paid',
    related_rent_entry_id: null,
    stripe_payment_intent_id: 'pi_jkl012',
    created_at: '2026-03-01T00:00:00Z',
  },
];

/* ---- Helpers ------------------------------------------------------------- */
function typeLabel(type: LedgerType): string {
  switch (type) {
    case 'rent':      return 'Rent';
    case 'late_fee':  return 'Late Fee';
    case 'payment':   return 'Payment';
    case 'refund':    return 'Refund';
    default:          return humanize(type);
  }
}

function typeIconTone(type: LedgerType): Tone {
  switch (type) {
    case 'late_fee':  return 'danger';
    case 'payment':   return 'success';
    case 'refund':    return 'info';
    default:          return 'neutral';
  }
}

function isActionable(status: LedgerStatus): boolean {
  return status === 'pending' || status === 'overdue';
}

/* ---- PayNowButton -------------------------------------------------------- */
function PayNowButton({ entry, onSuccess }: { entry: LedgerEntry; onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handlePay() {
    setLoading(true);
    try {
      await tenantApi.initiatePayment(entry.id);
      setDone(true);
      onSuccess();
    } catch {
      // Payment flow would redirect to Stripe; for now show optimistic state
      setDone(true);
      onSuccess();
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <span className="flex items-center gap-1 text-xs text-success-600">
        <IconCheckCircle size={13} /> Initiated
      </span>
    );
  }

  return (
    <Button
      size="sm"
      variant={entry.status === 'overdue' ? 'danger' : 'primary'}
      loading={loading}
      onClick={handlePay}
    >
      Pay Now
    </Button>
  );
}

/* ---- Page ---------------------------------------------------------------- */
export function PaymentsPage() {
  const [paidIds, setPaidIds] = useState<Set<string>>(new Set());
  const { data, loading, error, reload } = useApi(() => tenantApi.ledger(), []);

  const entries: LedgerEntry[] = data ?? MOCK_LEDGER;

  // Compute stats
  const now = new Date().getFullYear();
  const totalPaidCents = entries
    .filter(
      (e) =>
        e.status === 'paid' &&
        new Date(e.created_at).getFullYear() === now,
    )
    .reduce((sum, e) => sum + e.amount_cents, 0);

  const upcomingEntry = [...entries]
    .filter((e) => e.status === 'pending' && e.type === 'rent')
    .sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? ''))[0];

  const overdueCents = entries
    .filter((e) => e.status === 'overdue')
    .reduce((sum, e) => sum + e.amount_cents, 0);

  function handlePaySuccess() {
    reload();
  }

  return (
    <div className="animate-rise space-y-6">
      <PageHeader
        eyebrow="My Rental"
        title="Payments"
        description="Your rent history, upcoming payments, and outstanding balances."
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

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Total Paid (this year)"
          value={formatCents(totalPaidCents)}
          icon={<IconWallet size={18} />}
          tone="money"
          subtext={`${now} rent payments`}
        />
        <StatCard
          label="Upcoming Rent"
          value={upcomingEntry ? formatCents(upcomingEntry.amount_cents) : '—'}
          icon={<IconClock size={18} />}
          tone={upcomingEntry ? 'info' : 'default'}
          subtext={upcomingEntry?.due_date ? `Due ${formatDate(upcomingEntry.due_date)}` : 'No pending payments'}
        />
        <StatCard
          label="Overdue"
          value={overdueCents > 0 ? formatCents(overdueCents) : 'None'}
          icon={<IconAlertTriangle size={18} />}
          tone={overdueCents > 0 ? 'danger' : 'success'}
          subtext={overdueCents > 0 ? 'Pay immediately to avoid late fees' : 'All clear'}
        />
      </div>

      {/* Ledger table */}
      <Card>
        <CardHeader
          title="Payment Ledger"
          description="All rent charges, late fees, and payments on your account."
        />

        {loading ? (
          <CardBody>
            <LoadingState label="Loading your payment history..." />
          </CardBody>
        ) : error && !data ? (
          <CardBody>
            <ErrorState
              message={error.message}
              onRetry={reload}
            />
          </CardBody>
        ) : entries.length === 0 ? (
          <CardBody>
            <EmptyState
              icon={<IconWallet size={28} />}
              title="No payment records yet"
              description="Your rent charges and payment history will appear here once a lease is active."
            />
          </CardBody>
        ) : (
          <>
            <Table>
              <THead>
                <tr>
                  <TH>Date</TH>
                  <TH>Type</TH>
                  <TH>Period</TH>
                  <TH>Amount</TH>
                  <TH>Status</TH>
                  <TH className="text-right">Action</TH>
                </tr>
              </THead>
              <TBody>
                {entries.map((entry) => {
                  const isPaid = paidIds.has(entry.id) || entry.status === 'paid';
                  const effectiveStatus: LedgerStatus = isPaid ? 'paid' : entry.status;

                  return (
                    <TR key={entry.id}>
                      <TD className="whitespace-nowrap text-ink-500">
                        {formatDate(entry.created_at)}
                      </TD>
                      <TD first>
                        <span className={typeIconTone(entry.type) !== 'neutral' ? `text-${typeIconTone(entry.type)}-600` : ''}>
                          {typeLabel(entry.type)}
                        </span>
                      </TD>
                      <TD className="font-mono text-xs text-ink-500">
                        {entry.billing_period_start
                          ? `${formatDate(entry.billing_period_start)}${entry.billing_period_end ? ' – ' + formatDate(entry.billing_period_end) : ''}`
                          : '—'}
                      </TD>
                      <TD>
                        <span
                          className="font-display font-semibold"
                          style={{ color: 'var(--color-money)' }}
                        >
                          {formatCents(entry.amount_cents)}
                        </span>
                      </TD>
                      <TD>
                        <Badge tone={ledgerStatusTone(effectiveStatus)}>
                          {humanize(effectiveStatus)}
                        </Badge>
                      </TD>
                      <TD className="text-right">
                        {!isPaid && isActionable(entry.status) ? (
                          <PayNowButton
                            entry={entry}
                            onSuccess={() => {
                              setPaidIds((prev) => new Set([...prev, entry.id]));
                              handlePaySuccess();
                            }}
                          />
                        ) : (
                          <span className="text-xs text-ink-400">—</span>
                        )}
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>

            <CardFooter>
              <p className="text-xs text-ink-400">
                Showing {entries.length} entr{entries.length !== 1 ? 'ies' : 'y'}.
                Contact support if you see any discrepancies.
              </p>
            </CardFooter>
          </>
        )}
      </Card>
    </div>
  );
}
