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
import { IconChevronRight, IconLedger } from '@/components/ui/icons';
import { useToast } from '@/components/ui/toast';
import type { LedgerEntry } from '@/lib/types';

function isPayable(entry: LedgerEntry): boolean {
  return (
    (entry.type === 'rent' || entry.type === 'late_fee') &&
    (entry.status === 'pending' || entry.status === 'overdue')
  );
}

export function LedgerPage() {
  const { user } = useAuth();
  const role = user?.role;
  const { toast } = useToast();

  const [page, setPage] = useState(1);
  const [payingId, setPayingId] = useState<string | null>(null);

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
    try {
      await tenantApi.initiatePayment(entry.id);
      toast('Payment initiated', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Payment could not be initiated', 'error');
    } finally {
      setPayingId(null);
    }
  }

  const title = role === 'tenant' ? 'Payments' : 'Ledger';
  const entries = ledger.data?.entries;
  const isTenant = role === 'tenant';

  return (
    <div>
      <PageHeader
        title={title}
        description="Rent charges, fees, and payments across your contracts."
      />

      {isTenant && (
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Outstanding balance"
            value={formatCents(balance.data?.balance_cents ?? 0)}
            tone={(balance.data?.balance_cents ?? 0) > 0 ? 'warning' : 'success'}
            icon={<IconLedger className="h-[18px] w-[18px]" />}
            hint={(balance.data?.balance_cents ?? 0) > 0 ? 'Amount currently due' : 'You’re all paid up'}
            loading={balance.loading}
          />
        </div>
      )}

      {ledger.loading ? (
        <LoadingState />
      ) : ledger.error ? (
        <ErrorState message={ledger.error.message} onRetry={ledger.reload} />
      ) : !entries?.length ? (
        <EmptyState
          icon={<IconLedger />}
          title="No ledger entries"
          description="Charges and payments will appear here once a contract is active."
        />
      ) : (
        <>
          <Card>
            <CardBody className="p-0">
              <Table>
                <THead>
                  <TH>Type</TH>
                  <TH>Period</TH>
                  <TH>Due date</TH>
                  <TH>Amount</TH>
                  <TH>Status</TH>
                  {isTenant && <TH />}
                </THead>
                <TBody>
                  {entries.map((entry) => (
                    <TR key={entry.id}>
                      <TD className="font-medium text-ink-900">{humanize(entry.type)}</TD>
                      <TD className="whitespace-nowrap text-ink-600">
                        {entry.billing_period_start || entry.billing_period_end
                          ? `${formatDate(entry.billing_period_start)} → ${formatDate(entry.billing_period_end)}`
                          : '—'}
                      </TD>
                      <TD className="whitespace-nowrap text-ink-600">
                        {formatDate(entry.due_date)}
                      </TD>
                      <TD className="font-medium text-ink-900">
                        {formatCents(entry.amount_cents)}
                      </TD>
                      <TD>
                        <Badge tone={ledgerStatusTone(entry.status)}>
                          {humanize(entry.status)}
                        </Badge>
                      </TD>
                      {isTenant && (
                        <TD className="text-right">
                          {isPayable(entry) && (
                            <Button
                              size="sm"
                              onClick={() => pay(entry)}
                              loading={payingId === entry.id}
                              disabled={payingId !== null}
                            >
                              Pay
                            </Button>
                          )}
                        </TD>
                      )}
                    </TR>
                  ))}
                </TBody>
              </Table>
            </CardBody>
          </Card>

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
