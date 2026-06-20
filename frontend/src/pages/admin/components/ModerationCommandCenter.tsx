import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Field, Textarea } from '@/components/ui/Field';
import { Table, THead, TH, TBody, TR, TD } from '@/components/ui/Table';
import { EmptyState, LoadingState } from '@/components/ui/states';
import { IconShield } from '@/components/ui/icons';
import { formatDate } from '@/lib/format';
import type { Listing } from '@/lib/types';
import type { ModQueueItem } from '../adminMockData';

/* ---- Risk badge ---------------------------------------------------------- */

type RiskLevel = 'High' | 'Medium' | 'Low';

function riskBadgeTone(level: RiskLevel) {
  if (level === 'High') return 'danger' as const;
  if (level === 'Medium') return 'warning' as const;
  return 'success' as const;
}

function riskFromScore(score: number): RiskLevel {
  if (score >= 70) return 'High';
  if (score >= 40) return 'Medium';
  return 'Low';
}

/* ---- Reject modal -------------------------------------------------------- */

function RejectModal({
  open,
  title,
  onClose,
  onSubmit,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  onSubmit: (reason: string) => void;
}) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  function reset() {
    setReason('');
    setError(undefined);
    setLoading(false);
  }

  function handleClose() {
    if (loading) return;
    reset();
    onClose();
  }

  async function handleSubmit() {
    const trimmed = reason.trim();
    if (!trimmed) {
      setError('A reason is required.');
      return;
    }
    setLoading(true);
    try {
      await onSubmit(trimmed);
      reset();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Reject listing"
      description={`Tell the landlord why "${title}" was rejected.`}
      footer={
        <>
          <Button variant="secondary" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleSubmit} loading={loading}>
            Reject listing
          </Button>
        </>
      }
    >
      <Field label="Reason" required error={error}>
        {(id, invalid) => (
          <Textarea
            id={id}
            invalid={invalid}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (error) setError(undefined);
            }}
            placeholder="Explain what needs to change…"
          />
        )}
      </Field>
    </Modal>
  );
}

/* ---- Real-listing rows --------------------------------------------------- */

interface RealRowProps {
  listing: Listing;
  onApprove: (id: number) => void;
  onReject: (id: number, reason: string) => void;
  busyId: number | null;
  onOpenReject: (listing: Listing) => void;
}

function RealRow({ listing, onApprove, busyId, onOpenReject }: RealRowProps) {
  // Assign a deterministic risk level for mock demo
  const risk: RiskLevel = riskFromScore((listing.id * 37) % 100);
  return (
    <TR>
      <TD first>{listing.title}</TD>
      <TD className="text-ink-500">Landlord #{listing.landlord_id}</TD>
      <TD className="whitespace-nowrap text-ink-500">{formatDate(listing.created_at)}</TD>
      <TD>
        <Badge tone={riskBadgeTone(risk)}>{risk}</Badge>
      </TD>
      <TD>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => onApprove(listing.id)}
            loading={busyId === listing.id}
            disabled={busyId !== null}
          >
            Approve
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => onOpenReject(listing)}
            disabled={busyId !== null}
          >
            Reject
          </Button>
        </div>
      </TD>
    </TR>
  );
}

/* ---- Mock queue rows ----------------------------------------------------- */

function MockRow({ item, onOpenReject }: { item: ModQueueItem; onOpenReject: () => void }) {
  return (
    <TR>
      <TD first>
        <div className="flex items-center gap-3">
          <img
            src={item.img}
            alt=""
            className="h-9 w-9 rounded-lg object-cover shrink-0"
          />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink-900 truncate max-w-[160px]">
              {item.title}
            </p>
            <p className="text-xs text-ink-500">{item.location}</p>
          </div>
        </div>
      </TD>
      <TD>
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[11px] font-semibold text-brand-700">
            {item.initials}
          </span>
          <span className="text-sm text-ink-700">{item.landlord}</span>
        </div>
      </TD>
      <TD className="whitespace-nowrap text-ink-500">{item.submitted}</TD>
      <TD>
        <Badge tone={riskBadgeTone(item.riskLabel)}>{item.riskLabel}</Badge>
      </TD>
      <TD>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary">Approve</Button>
          <Button size="sm" variant="danger" onClick={onOpenReject}>Reject</Button>
        </div>
      </TD>
    </TR>
  );
}

/* ---- Main component ------------------------------------------------------ */

interface Props {
  /** Real API listings. Null = not yet loaded or using mock. */
  listings: Listing[] | null;
  /** Fallback mock items rendered when listings is null. */
  mockQueue?: ModQueueItem[];
  onApprove: (id: number) => void;
  onReject: (id: number, reason: string) => void;
  loading?: boolean;
}

export function ModerationCommandCenter({
  listings,
  mockQueue,
  onApprove,
  onReject,
  loading,
}: Props) {
  const [rejectTarget, setRejectTarget] = useState<{ id: number; title: string } | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  async function handleApprove(id: number) {
    setBusyId(id);
    try {
      onApprove(id);
    } finally {
      setBusyId(null);
    }
  }

  function openReject(listing: Listing) {
    setRejectTarget({ id: listing.id, title: listing.title });
  }

  async function handleRejectSubmit(reason: string) {
    if (!rejectTarget) return;
    onReject(rejectTarget.id, reason);
    setRejectTarget(null);
  }

  if (loading) {
    return <LoadingState label="Loading queue…" />;
  }

  const hasRealListings = listings && listings.length > 0;
  const hasMock = mockQueue && mockQueue.length > 0;

  if (!hasRealListings && !hasMock) {
    return (
      <EmptyState
        icon={<IconShield />}
        title="Queue clear"
        description="No listings awaiting review."
      />
    );
  }

  return (
    <>
      <Table>
        <THead>
          <TR>
            <TH>Listing</TH>
            <TH>Landlord</TH>
            <TH>Submitted</TH>
            <TH>Risk</TH>
            <TH>{/* actions */}</TH>
          </TR>
        </THead>
        <TBody>
          {hasRealListings
            ? listings!.map((l) => (
                <RealRow
                  key={l.id}
                  listing={l}
                  onApprove={handleApprove}
                  onReject={onReject}
                  busyId={busyId}
                  onOpenReject={openReject}
                />
              ))
            : mockQueue!.map((item, i) => (
                <MockRow
                  key={i}
                  item={item}
                  onOpenReject={() => setRejectTarget({ id: i, title: item.title })}
                />
              ))}
        </TBody>
      </Table>

      <RejectModal
        open={rejectTarget !== null}
        title={rejectTarget?.title ?? ''}
        onClose={() => setRejectTarget(null)}
        onSubmit={handleRejectSubmit}
      />
    </>
  );
}
