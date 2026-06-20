import { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Table, THead, TH, TBody, TR, TD } from '@/components/ui/Table';
import { EmptyState } from '@/components/ui/states';
import {
  IconUsers,
  IconCheck,
  IconAlertTriangle,
  IconXCircle,
  IconDoc,
  IconClock,
} from '@/components/ui/icons';
import { formatCedisDecimal, formatDate } from '@/lib/format';
import { Link } from 'react-router';

/* ---- Types -------------------------------------------------------------- */

type PaymentStatus = 'paid' | 'pending' | 'overdue';

interface ActiveTenant {
  id: string;
  name: string;
  email: string;
  property: string;
  unit: string;
  contract_start: string;
  lease_end: string;
  monthly_rent: string; // GH₵ decimal string
  payment_status: PaymentStatus;
  next_payment: string;
}

/* ---- Mock data ---------------------------------------------------------- */

const MOCK_TENANTS: ActiveTenant[] = [
  {
    id: 'tenant-001',
    name: 'Kwame Asante',
    email: 'k.asante@gmail.com',
    property: 'Labone Close Residences',
    unit: 'B2',
    contract_start: '2026-02-01',
    lease_end: '2027-01-31',
    monthly_rent: '5800.00',
    payment_status: 'paid',
    next_payment: '2026-07-01',
  },
  {
    id: 'tenant-002',
    name: 'Esi Boateng',
    email: 'esi.b@yahoo.com',
    property: 'East Legon Heights',
    unit: 'A3',
    contract_start: '2026-01-15',
    lease_end: '2027-01-14',
    monthly_rent: '8500.00',
    payment_status: 'pending',
    next_payment: '2026-07-01',
  },
  {
    id: 'tenant-003',
    name: 'Nana Oppong',
    email: 'noppong@ug.edu.gh',
    property: 'Adenta Housing',
    unit: 'C2',
    contract_start: '2025-09-01',
    lease_end: '2026-08-31',
    monthly_rent: '3200.00',
    payment_status: 'overdue',
    next_payment: '2026-06-01',
  },
];

/* ---- Helpers ------------------------------------------------------------ */

function paymentStatusTone(s: PaymentStatus) {
  if (s === 'paid')    return 'success' as const;
  if (s === 'overdue') return 'danger' as const;
  return 'warning' as const;
}

function paymentStatusLabel(s: PaymentStatus) {
  if (s === 'paid')    return 'Paid';
  if (s === 'overdue') return 'Overdue';
  return 'Pending';
}

function PaymentIcon({ status }: { status: PaymentStatus }) {
  if (status === 'paid')    return <IconCheck size={14} />;
  if (status === 'overdue') return <IconXCircle size={14} />;
  return <IconClock size={14} />;
}

function Initials({ name }: { name: string }) {
  const parts = name.trim().split(' ');
  const letters =
    parts.length >= 2 ? parts[0][0] + parts[parts.length - 1][0] : parts[0].slice(0, 2);
  return (
    <span
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700"
      aria-hidden="true"
    >
      {letters.toUpperCase()}
    </span>
  );
}

/* ---- Component ---------------------------------------------------------- */

export function TenantManagement() {
  const [leaseTarget, setLeaseTarget] = useState<ActiveTenant | null>(null);

  const totalRent = MOCK_TENANTS.reduce((s, t) => s + parseFloat(t.monthly_rent), 0);
  const overdueCount = MOCK_TENANTS.filter((t) => t.payment_status === 'overdue').length;
  const paidCount    = MOCK_TENANTS.filter((t) => t.payment_status === 'paid').length;

  return (
    <div className="animate-rise space-y-6">
      <PageHeader
        eyebrow="Operations"
        title="Tenants"
        description="Your current active tenants and lease status."
        action={
          <Link to="/app/ledger">
            <Button variant="secondary" size="sm" leftIcon={<IconDoc size={15} />}>
              View Rent Ledger
            </Button>
          </Link>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="Active Tenants"
          value={MOCK_TENANTS.length}
          icon={<IconUsers size={17} />}
        />
        <StatCard
          label="Rent Collected"
          value={paidCount}
          subtext={`of ${MOCK_TENANTS.length} due`}
          tone="success"
          icon={<IconCheck size={17} />}
        />
        <StatCard
          label="Overdue"
          value={overdueCount}
          tone={overdueCount > 0 ? 'danger' : 'success'}
          icon={<IconAlertTriangle size={17} />}
        />
        <StatCard
          label="Monthly Rent Roll"
          value={`GH₵ ${totalRent.toLocaleString('en-GH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
          tone="money"
          icon={<IconDoc size={17} />}
        />
      </div>

      {/* Tenants table */}
      <Card>
        <CardHeader
          title="Active Tenants"
          description="All tenants with a currently active lease."
        />
        <CardBody className="pt-2">
          {MOCK_TENANTS.length === 0 ? (
            <EmptyState
              icon={<IconUsers />}
              title="No active tenants"
              description="Once a tenant accepts a contract, they will appear here."
              action={
                <Link to="/app/applicants">
                  <Button>Review Applicants</Button>
                </Link>
              }
            />
          ) : (
            <Table>
              <THead>
                <TH>Tenant</TH>
                <TH>Property / Unit</TH>
                <TH>Monthly Rent</TH>
                <TH>Next Payment</TH>
                <TH>Lease End</TH>
                <TH>Status</TH>
                <TH className="text-right">Action</TH>
              </THead>
              <TBody>
                {MOCK_TENANTS.map((t) => (
                  <TR key={t.id}>
                    <TD>
                      <div className="flex items-center gap-2">
                        <Initials name={t.name} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-ink-900 truncate">{t.name}</p>
                          <p className="text-xs text-ink-500 truncate">{t.email}</p>
                        </div>
                      </div>
                    </TD>
                    <TD>
                      <p className="text-sm text-ink-900">{t.property}</p>
                      <p className="text-xs text-ink-500">Unit {t.unit}</p>
                    </TD>
                    <TD>
                      <span style={{ color: 'var(--color-money)' }} className="font-semibold text-sm">
                        {formatCedisDecimal(t.monthly_rent)}
                      </span>
                    </TD>
                    <TD>
                      <span
                        className={
                          t.payment_status === 'overdue'
                            ? 'text-sm text-danger-600 font-medium'
                            : 'text-sm text-ink-700'
                        }
                      >
                        {formatDate(t.next_payment)}
                      </span>
                    </TD>
                    <TD className="text-sm text-ink-700">{formatDate(t.lease_end)}</TD>
                    <TD>
                      <Badge tone={paymentStatusTone(t.payment_status)}>
                        <PaymentIcon status={t.payment_status} />
                        <span className="ml-1">{paymentStatusLabel(t.payment_status)}</span>
                      </Badge>
                    </TD>
                    <TD className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setLeaseTarget(t)}
                      >
                        View Lease
                      </Button>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardBody>
      </Card>

      {/* Lease detail modal */}
      <Modal
        open={leaseTarget !== null}
        onClose={() => setLeaseTarget(null)}
        title="Lease Summary"
        description={leaseTarget ? `${leaseTarget.name} · ${leaseTarget.property} · Unit ${leaseTarget.unit}` : undefined}
        size="sm"
        footer={
          <Button variant="secondary" onClick={() => setLeaseTarget(null)}>
            Close
          </Button>
        }
      >
        {leaseTarget && (
          <dl className="space-y-3 text-sm">
            <Row label="Tenant"       value={leaseTarget.name} />
            <Row label="Email"        value={leaseTarget.email} />
            <Row label="Property"     value={leaseTarget.property} />
            <Row label="Unit"         value={`Unit ${leaseTarget.unit}`} />
            <Row label="Monthly Rent" value={formatCedisDecimal(leaseTarget.monthly_rent)} money />
            <Row label="Lease Start"  value={formatDate(leaseTarget.contract_start)} />
            <Row label="Lease End"    value={formatDate(leaseTarget.lease_end)} />
            <Row label="Next Payment" value={formatDate(leaseTarget.next_payment)} />
            <div className="flex items-center justify-between pt-1">
              <dt className="text-ink-500">Payment Status</dt>
              <dd>
                <Badge tone={paymentStatusTone(leaseTarget.payment_status)}>
                  {paymentStatusLabel(leaseTarget.payment_status)}
                </Badge>
              </dd>
            </div>
          </dl>
        )}
      </Modal>
    </div>
  );
}

function Row({
  label,
  value,
  money,
}: {
  label: string;
  value: string;
  money?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-ink-500">{label}</dt>
      <dd
        className="font-medium text-ink-900"
        style={money ? { color: 'var(--color-money)' } : undefined}
      >
        {value}
      </dd>
    </div>
  );
}
