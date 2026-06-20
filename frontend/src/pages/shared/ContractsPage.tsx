import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '@/context/auth';
import { useApi } from '@/hooks/useApi';
import { adminApi, landlordApi, tenantApi } from '@/lib/endpoints';
import { contractStatusTone, formatCents, formatDate, humanize } from '@/lib/format';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Field, Input } from '@/components/ui/Field';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { IconDoc, IconPlus, IconUsers, IconCalendar, IconLedger } from '@/components/ui/icons';
import { cn } from '@/lib/cn';
import type { Contract, ContractStatus } from '@/lib/types';

type FilterTab = 'all' | ContractStatus;

const FILTER_TABS: { value: FilterTab; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'pending_tenant', label: 'Pending' },
  { value: 'active', label: 'Active' },
  { value: 'terminated', label: 'Terminated' },
  { value: 'expired', label: 'Expired' },
];

interface CreateContractForm {
  listing_id: string;
  tenant_email: string;
  rent_amount: string;
  payment_day: string;
  start_date: string;
  end_date: string;
}

const EMPTY_FORM: CreateContractForm = {
  listing_id: '',
  tenant_email: '',
  rent_amount: '',
  payment_day: '1',
  start_date: '',
  end_date: '',
};

function ContractCard({ contract, onClick }: { contract: Contract; onClick: () => void }) {
  const landlordName = contract.landlord
    ? `${contract.landlord.first_name} ${contract.landlord.last_name}`
    : `Landlord #${contract.landlord_id}`;
  const tenantName = contract.tenant
    ? `${contract.tenant.first_name} ${contract.tenant.last_name}`
    : `Tenant #${contract.tenant_id}`;

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left transition-all rounded-2xl border border-ink-200 bg-surface shadow-sm hover:shadow-md hover:border-ink-300 focus-visible:outline-2 focus-visible:outline-brand-600 overflow-hidden group"
    >
      {/* Top accent strip based on status */}
      <div
        className={cn(
          'h-1 w-full',
          contract.status === 'active' ? 'bg-success-500' :
          contract.status === 'draft' ? 'bg-ink-200' :
          contract.status === 'pending_tenant' ? 'bg-warning-400' :
          contract.status === 'terminated' ? 'bg-danger-400' :
          'bg-ink-300',
        )}
      />
      <div className="px-5 py-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-display text-base font-semibold text-ink-900 truncate">
              {contract.listing?.title ?? `Contract ${contract.id.slice(0, 8)}…`}
            </p>
            {contract.listing?.unit?.property?.name && (
              <p className="mt-0.5 text-sm text-ink-500 truncate">
                {contract.listing.unit.property.name}
              </p>
            )}
          </div>
          <Badge tone={contractStatusTone(contract.status)}>
            {humanize(contract.status)}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div className="flex items-center gap-1.5 text-ink-600">
            <IconUsers size={14} className="shrink-0 text-ink-400" />
            <span className="truncate">{landlordName}</span>
          </div>
          <div className="flex items-center gap-1.5 text-ink-600">
            <IconUsers size={14} className="shrink-0 text-ink-400" />
            <span className="truncate">{tenantName}</span>
          </div>
          <div className="flex items-center gap-1.5 text-ink-600">
            <IconCalendar size={14} className="shrink-0 text-ink-400" />
            <span>
              {formatDate(contract.start_date)} – {formatDate(contract.end_date)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 font-medium" style={{ color: 'var(--color-money)' }}>
            <IconLedger size={14} className="shrink-0" />
            <span>{formatCents(contract.rent_amount)}/mo</span>
          </div>
        </div>
      </div>
      <div className="border-t border-ink-100 px-5 py-2.5 bg-ink-50/50">
        <span className="text-xs font-medium text-brand-700 group-hover:underline">
          View contract →
        </span>
      </div>
    </button>
  );
}

export function ContractsPage() {
  const { user } = useAuth();
  const role = user?.role;
  const navigate = useNavigate();

  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<CreateContractForm>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof CreateContractForm, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [createSuccess, setCreateSuccess] = useState(false);

  const { data, loading, error, reload } = useApi<Contract[]>(async () => {
    if (role === 'tenant') return tenantApi.contracts();
    if (role === 'landlord') return landlordApi.contracts();
    if (role === 'admin') return (await adminApi.contracts()).data;
    return [];
  }, [role]);

  const filtered =
    !data ? [] :
    activeFilter === 'all' ? data :
    data.filter((c) => c.status === activeFilter);

  function openCreate() {
    setForm(EMPTY_FORM);
    setFormErrors({});
    setCreateSuccess(false);
    setCreateOpen(true);
  }

  function closeCreate() {
    if (!submitting) setCreateOpen(false);
  }

  function setField(key: keyof CreateContractForm, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (formErrors[key]) setFormErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  async function handleCreate() {
    const errors: Partial<Record<keyof CreateContractForm, string>> = {};
    if (!form.listing_id.trim()) errors.listing_id = 'Listing ID is required.';
    if (!form.tenant_email.trim()) errors.tenant_email = 'Tenant email is required.';
    const rent = parseInt(form.rent_amount, 10);
    if (!form.rent_amount || isNaN(rent) || rent <= 0)
      errors.rent_amount = 'Enter a valid rent amount in cedis.';
    const day = parseInt(form.payment_day, 10);
    if (!form.payment_day || isNaN(day) || day < 1 || day > 28)
      errors.payment_day = 'Payment day must be 1–28.';
    if (!form.start_date) errors.start_date = 'Start date is required.';
    if (!form.end_date) errors.end_date = 'End date is required.';
    if (form.start_date && form.end_date && form.end_date <= form.start_date)
      errors.end_date = 'End date must be after start date.';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setSubmitting(true);
    try {
      await landlordApi.createContract({
        listing_id: parseInt(form.listing_id, 10),
        tenant_id: 0, // In practice you'd resolve tenant_email → id server-side
        rent_amount: rent * 100, // convert cedis to cents
        payment_day: day,
        start_date: form.start_date,
        end_date: form.end_date,
      });
      setCreateSuccess(true);
      reload();
      setTimeout(() => setCreateOpen(false), 1200);
    } catch {
      setFormErrors({ listing_id: 'Failed to create contract. Check all fields and try again.' });
    } finally {
      setSubmitting(false);
    }
  }

  const emptyDescription =
    role === 'landlord'
      ? 'Contracts you create for tenants will appear here.'
      : role === 'admin'
        ? 'Contracts created across the platform will appear here.'
        : 'When a landlord sends you a contract, it will appear here for review.';

  const description =
    role === 'tenant'
      ? 'Your lease agreements and their current status.'
      : role === 'landlord'
        ? 'Lease contracts you have drafted or sent to tenants.'
        : 'All contracts across the platform.';

  return (
    <div className="animate-rise space-y-6">
      <PageHeader
        eyebrow={role === 'admin' ? 'Administration' : role === 'landlord' ? 'Operations' : 'My Rental'}
        title="Contracts"
        description={description}
        action={
          role === 'landlord' ? (
            <Button onClick={openCreate} leftIcon={<IconPlus size={16} />}>
              Create Contract
            </Button>
          ) : undefined
        }
      />

      {/* Filter tabs */}
      {data && data.length > 0 && (
        <div className="flex gap-1 overflow-x-auto rounded-xl bg-ink-100 border border-ink-200 p-1 w-fit">
          {FILTER_TABS.map(({ value, label }) => {
            const count = value === 'all' ? data.length : data.filter((c) => c.status === value).length;
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
      )}

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error.message} onRetry={reload} />
      ) : !data?.length ? (
        <EmptyState icon={<IconDoc />} title="No contracts yet" description={emptyDescription} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<IconDoc />}
          title={`No ${activeFilter === 'all' ? '' : humanize(activeFilter) + ' '}contracts`}
          description="Try selecting a different filter above."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((contract) => (
            <ContractCard
              key={contract.id}
              contract={contract}
              onClick={() => navigate(`/app/contracts/${contract.id}`)}
            />
          ))}
        </div>
      )}

      {/* Create Contract Modal */}
      <Modal
        open={createOpen}
        onClose={closeCreate}
        title="Create Contract"
        description="Draft a new lease agreement for a tenant."
        size="md"
        footer={
          createSuccess ? (
            <span className="text-sm font-medium text-success-600">Contract created!</span>
          ) : (
            <>
              <Button variant="secondary" onClick={closeCreate} disabled={submitting}>
                Cancel
              </Button>
              <Button onClick={handleCreate} loading={submitting}>
                Create
              </Button>
            </>
          )
        }
      >
        <div className="space-y-4">
          <Field label="Listing ID" required error={formErrors.listing_id}>
            {(id, invalid) => (
              <Input
                id={id}
                invalid={invalid}
                type="number"
                placeholder="e.g. 42"
                value={form.listing_id}
                onChange={(e) => setField('listing_id', e.target.value)}
              />
            )}
          </Field>
          <Field
            label="Tenant email"
            required
            error={formErrors.tenant_email}
            hint="The tenant must already have a Nexus account."
          >
            {(id, invalid) => (
              <Input
                id={id}
                invalid={invalid}
                type="email"
                placeholder="tenant@example.com"
                value={form.tenant_email}
                onChange={(e) => setField('tenant_email', e.target.value)}
              />
            )}
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Monthly rent (GH₵)" required error={formErrors.rent_amount}>
              {(id, invalid) => (
                <Input
                  id={id}
                  invalid={invalid}
                  type="number"
                  min={1}
                  placeholder="e.g. 1500"
                  value={form.rent_amount}
                  onChange={(e) => setField('rent_amount', e.target.value)}
                />
              )}
            </Field>
            <Field
              label="Payment day"
              required
              error={formErrors.payment_day}
              hint="Day of each month (1–28)"
            >
              {(id, invalid) => (
                <Input
                  id={id}
                  invalid={invalid}
                  type="number"
                  min={1}
                  max={28}
                  value={form.payment_day}
                  onChange={(e) => setField('payment_day', e.target.value)}
                />
              )}
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Start date" required error={formErrors.start_date}>
              {(id, invalid) => (
                <Input
                  id={id}
                  invalid={invalid}
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setField('start_date', e.target.value)}
                />
              )}
            </Field>
            <Field label="End date" required error={formErrors.end_date}>
              {(id, invalid) => (
                <Input
                  id={id}
                  invalid={invalid}
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setField('end_date', e.target.value)}
                />
              )}
            </Field>
          </div>
        </div>
      </Modal>
    </div>
  );
}
