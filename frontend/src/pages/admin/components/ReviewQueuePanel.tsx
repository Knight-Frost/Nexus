import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Field, Textarea } from '@/components/ui/Field';
import { EmptyState, Skeleton } from '@/components/ui/states';
import { IconCheck, IconX, IconShield } from '@/components/ui/icons';
import {
  NexusCard,
  DashboardSection,
  SectionHeader,
} from '@/components/cards';
import { formatDate, formatCedisDecimal } from '@/lib/format';
import type { Listing } from '@/lib/types';

interface ReviewQueuePanelProps {
  listings: Listing[];
  loading: boolean;
  busyId: number | null;
  onApprove: (listing: Listing) => void;
  onReject: (listing: Listing, reason: string) => Promise<void>;
  onOpenQueue: () => void;
}

/**
 * Live listing-review queue. Every row is a real pending listing and the
 * Approve / Reject actions call the admin API for real (Reject collects a
 * reason via modal). No dead buttons, no mock rows.
 */
export function ReviewQueuePanel({
  listings,
  loading,
  busyId,
  onApprove,
  onReject,
  onOpenQueue,
}: ReviewQueuePanelProps) {
  const [rejecting, setRejecting] = useState<Listing | null>(null);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  const rows = listings.slice(0, 5);

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
      await onReject(rejecting, trimmed);
      setRejecting(null);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DashboardSection>
      <SectionHeader
        eyebrow="Moderation"
        title="Listing review queue"
        action={
          <Button variant="primary" size="sm" onClick={onOpenQueue}>
            View queue
            {listings.length > 0 && (
              <Badge tone="warning" dot={false} className="ml-2">
                {listings.length}
              </Badge>
            )}
          </Button>
        }
      />

      <NexusCard role="neutral">
        {loading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-8 w-20 rounded-lg" />
              </div>
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="p-2">
            <EmptyState
              icon={<IconShield />}
              title="All clear!"
              description="No listings are awaiting review. New submissions will appear here."
            />
          </div>
        ) : (
          <div>
            {rows.map((listing) => (
              <div key={listing.id} className="adm-queue-row">
                <div className="min-w-0 flex-1">
                  <h4 className="truncate text-sm font-semibold text-ink-900">
                    {listing.title}
                  </h4>
                  <p className="mt-0.5 text-xs text-ink-500">
                    {listing.landlord?.full_name ?? `Landlord #${listing.landlord_id}`}
                    {' · Submitted '}
                    {formatDate(listing.created_at)}
                  </p>
                  {listing.unit && (
                    <p className="mt-1 text-xs text-ink-600">
                      {listing.unit.unit_number} ·{' '}
                      <span className="font-semibold" style={{ color: 'var(--color-money)' }}>
                        {formatCedisDecimal(listing.unit.rent_amount)}
                      </span>
                      /mo
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    size="sm"
                    leftIcon={<IconCheck className="h-4 w-4" />}
                    onClick={() => onApprove(listing)}
                    loading={busyId === listing.id}
                    disabled={busyId !== null}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    leftIcon={<IconX className="h-4 w-4" />}
                    onClick={() => openReject(listing)}
                    disabled={busyId !== null}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </NexusCard>

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
    </DashboardSection>
  );
}
