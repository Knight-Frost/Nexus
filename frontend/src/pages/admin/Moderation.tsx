import { useState } from 'react';
import { useApi } from '@/hooks/useApi';
import { adminApi } from '@/lib/endpoints';
import { formatDate, formatCedisDecimal } from '@/lib/format';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Field, Textarea } from '@/components/ui/Field';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { IconShield, IconCheck, IconX } from '@/components/ui/icons';
import type { Listing } from '@/lib/types';

/* ---- Filter tabs --------------------------------------------------------- */

type FilterKey = 'pending' | 'all' | 'approved' | 'rejected';

const FILTER_TABS: { key: FilterKey; label: string }[] = [
  { key: 'pending', label: 'Pending' },
  { key: 'all', label: 'All' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
];

function filterListings(listings: Listing[], filter: FilterKey): Listing[] {
  if (filter === 'pending') return listings.filter((l) => l.status === 'pending_review');
  if (filter === 'approved') return listings.filter((l) => l.status === 'active');
  if (filter === 'rejected') return listings.filter((l) => l.status === 'rejected');
  return listings;
}

function statusTone(status: Listing['status']) {
  switch (status) {
    case 'active': return 'success' as const;
    case 'pending_review': return 'warning' as const;
    case 'rejected': return 'danger' as const;
    case 'archived': return 'neutral' as const;
    default: return 'neutral' as const;
  }
}

function statusLabel(status: Listing['status']) {
  switch (status) {
    case 'active': return 'Approved';
    case 'pending_review': return 'Pending';
    case 'rejected': return 'Rejected';
    case 'draft': return 'Draft';
    case 'archived': return 'Archived';
    default: return status;
  }
}

/* ---- Main page ----------------------------------------------------------- */

export function Moderation() {
  const { data, loading, error, reload } = useApi(() => adminApi.pendingListings(), []);

  const [filter, setFilter] = useState<FilterKey>('pending');
  const [rejecting, setRejecting] = useState<Listing | null>(null);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | undefined>();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [localOverrides, setLocalOverrides] = useState<Record<number, Listing['status']>>({});

  // All listings with local optimistic overrides applied
  const allListings: Listing[] = (data ?? []).map((l) =>
    localOverrides[l.id] ? { ...l, status: localOverrides[l.id]! } : l,
  );
  const visible = filterListings(allListings, filter);

  async function approve(listing: Listing) {
    setBusyId(listing.id);
    try {
      await adminApi.approveListing(listing.id);
      setLocalOverrides((prev) => ({ ...prev, [listing.id]: 'active' }));
    } catch {
      // reload to get real state on failure
      reload();
    } finally {
      setBusyId(null);
    }
  }

  function openReject(listing: Listing) {
    setRejecting(listing);
    setReason('');
    setReasonError(undefined);
  }

  function closeReject() {
    if (submitting) return;
    setRejecting(null);
  }

  async function submitReject() {
    if (!rejecting) return;
    const trimmed = reason.trim();
    if (!trimmed) {
      setReasonError('A reason is required.');
      return;
    }
    setSubmitting(true);
    try {
      await adminApi.rejectListing(rejecting.id, trimmed);
      setLocalOverrides((prev) => ({ ...prev, [rejecting.id]: 'rejected' }));
      setRejecting(null);
    } catch {
      reload();
    } finally {
      setSubmitting(false);
    }
  }

  const pendingCount = allListings.filter((l) => l.status === 'pending_review').length;

  return (
    <div className="animate-rise">
      <PageHeader
        eyebrow="Platform"
        title="Listing Review"
        description="Review and approve rental listings before they go live to prospective tenants."
        action={
          pendingCount > 0 ? (
            <Badge tone="warning" dot={false} size="md">
              {pendingCount} pending
            </Badge>
          ) : undefined
        }
      />

      {/* Filter tabs */}
      <div className="mb-5 flex gap-0 border-b border-ink-200">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={[
              'inline-flex items-center gap-2 mr-6 py-2.5 px-1 text-sm font-medium border-b-2 -mb-px transition-colors',
              filter === tab.key
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-ink-500 hover:text-ink-800',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingState label="Loading listings…" />
      ) : error ? (
        <ErrorState message={error.message} onRetry={reload} />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<IconShield />}
          title="Nothing here"
          description={
            filter === 'pending'
              ? 'No listings awaiting review. Check back later.'
              : 'No listings match this filter.'
          }
        />
      ) : (
        <div className="space-y-4">
          {visible.map((listing) => (
            <Card key={listing.id}>
              <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-3 flex-wrap">
                    <h3 className="text-base font-semibold text-ink-900 leading-snug">
                      {listing.title}
                    </h3>
                    <Badge tone={statusTone(listing.status)}>
                      {statusLabel(listing.status)}
                    </Badge>
                  </div>

                  <p className="mt-1 text-sm text-ink-500">
                    Landlord #{listing.landlord_id} · Submitted {formatDate(listing.created_at)}
                  </p>

                  {listing.unit && (
                    <p className="mt-2 text-sm text-ink-600">
                      Unit {listing.unit.unit_number} · {listing.unit.bedrooms} bd ·{' '}
                      {listing.unit.bathrooms} ba ·{' '}
                      <span style={{ color: 'var(--color-money)' }} className="font-semibold">
                        {formatCedisDecimal(listing.unit.rent_amount)}
                      </span>
                      /mo
                    </p>
                  )}

                  {listing.description && (
                    <p className="mt-2 line-clamp-3 max-w-2xl text-sm text-ink-600">
                      {listing.description}
                    </p>
                  )}

                  {listing.rejection_reason && (
                    <p className="mt-2 text-sm text-danger-600">
                      <span className="font-medium">Rejection reason:</span>{' '}
                      {listing.rejection_reason}
                    </p>
                  )}
                </div>

                {listing.status === 'pending_review' && (
                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      leftIcon={<IconCheck className="h-4 w-4" />}
                      onClick={() => approve(listing)}
                      loading={busyId === listing.id}
                      disabled={busyId !== null}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="danger"
                      leftIcon={<IconX className="h-4 w-4" />}
                      onClick={() => openReject(listing)}
                      disabled={busyId !== null}
                    >
                      Reject
                    </Button>
                  </div>
                )}
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={rejecting !== null}
        onClose={closeReject}
        title="Reject listing"
        description={
          rejecting ? `Tell the landlord why "${rejecting.title}" was rejected.` : undefined
        }
        footer={
          <>
            <Button variant="secondary" onClick={closeReject} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="danger" onClick={submitReject} loading={submitting}>
              Reject listing
            </Button>
          </>
        }
      >
        <Field label="Reason" required error={reasonError}>
          {(id, invalid) => (
            <Textarea
              id={id}
              invalid={invalid}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (reasonError) setReasonError(undefined);
              }}
              placeholder="Explain what needs to change…"
            />
          )}
        </Field>
      </Modal>
    </div>
  );
}
