import { useState } from 'react';
import { useApi } from '@/hooks/useApi';
import { adminApi } from '@/lib/endpoints';
import { formatDate, formatDollars } from '@/lib/format';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Field, Textarea } from '@/components/ui/Field';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { IconShield } from '@/components/ui/icons';
import { useToast } from '@/components/ui/toast';
import type { Listing } from '@/lib/types';

export function Moderation() {
  const { toast } = useToast();
  const { data, loading, error, reload } = useApi(() => adminApi.pendingListings(), []);

  const [rejecting, setRejecting] = useState<Listing | null>(null);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | undefined>();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function approve(listing: Listing) {
    setBusyId(listing.id);
    try {
      await adminApi.approveListing(listing.id);
      toast('Listing approved', 'success');
      reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to approve listing', 'error');
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
      toast('Listing rejected', 'success');
      setRejecting(null);
      reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to reject listing', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Listing moderation"
        description="Review listings awaiting approval before they go live."
      />

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error.message} onRetry={reload} />
      ) : !data?.length ? (
        <EmptyState
          icon={<IconShield />}
          title="Nothing to review"
          description="New submissions from landlords will appear here for moderation."
        />
      ) : (
        <div className="grid gap-4">
          {data.map((listing) => (
            <Card key={listing.id}>
              <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-ink-900">{listing.title}</h3>
                  <p className="mt-0.5 text-sm text-ink-500">
                    Landlord #{listing.landlord_id} · Submitted {formatDate(listing.created_at)}
                  </p>
                  {listing.unit && (
                    <p className="mt-2 text-sm text-ink-600">
                      Unit {listing.unit.unit_number} · {listing.unit.bedrooms} bd ·{' '}
                      {listing.unit.bathrooms} ba · {formatDollars(listing.unit.rent_amount)}/mo
                    </p>
                  )}
                  {listing.description && (
                    <p className="mt-2 line-clamp-3 max-w-2xl text-sm text-ink-600">
                      {listing.description}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    onClick={() => approve(listing)}
                    loading={busyId === listing.id}
                    disabled={busyId !== null}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => openReject(listing)}
                    disabled={busyId !== null}
                  >
                    Reject
                  </Button>
                </div>
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
