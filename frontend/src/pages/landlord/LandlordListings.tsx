import { useState } from 'react';
import { Link } from 'react-router';
import { useApi } from '@/hooks/useApi';
import { landlordApi } from '@/lib/endpoints';
import type { ApiError, Listing, ListingStatus } from '@/lib/types';
import { formatCedisDecimal, humanize, listingStatusTone } from '@/lib/format';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { IconAlertTriangle, IconEdit, IconEye, IconHome, IconPlus } from '@/components/ui/icons';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/cn';

type FilterTab = 'all' | ListingStatus;

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'all',           label: 'All' },
  { key: 'active',        label: 'Active' },
  { key: 'draft',         label: 'Draft' },
  { key: 'pending_review', label: 'Pending Review' },
  { key: 'rejected',      label: 'Rejected' },
  { key: 'archived',      label: 'Archived' },
];

export function LandlordListings() {
  const { toast } = useToast();
  const { data, loading, error, reload } = useApi(() => landlordApi.listings(), []);

  const [tab, setTab] = useState<FilterTab>('all');
  const [busyId, setBusyId]     = useState<number | null>(null);
  const [busyAction, setBusyAction] = useState<'submit' | 'delete' | null>(null);

  async function handleSubmit(listing: Listing) {
    setBusyId(listing.id);
    setBusyAction('submit');
    try {
      await landlordApi.submitListing(listing.id);
      toast('Listing submitted for review', 'success');
      reload();
    } catch (err) {
      toast((err as ApiError).message, 'error');
    } finally {
      setBusyId(null);
      setBusyAction(null);
    }
  }

  async function handleDelete(listing: Listing) {
    setBusyId(listing.id);
    setBusyAction('delete');
    try {
      await landlordApi.deleteListing(listing.id);
      toast('Listing deleted', 'success');
      reload();
    } catch (err) {
      toast((err as ApiError).message, 'error');
    } finally {
      setBusyId(null);
      setBusyAction(null);
    }
  }

  const filtered =
    tab === 'all' ? (data ?? []) : (data ?? []).filter((l) => l.status === tab);

  const tabCounts = (data ?? []).reduce<Record<string, number>>((acc, l) => {
    acc[l.status] = (acc[l.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="animate-rise space-y-6">
      <PageHeader
        eyebrow="Portfolio"
        title="Listings"
        description="Publish and track rental listings across your units."
        action={
          <Link to="/app/properties">
            <Button leftIcon={<IconPlus className="h-4 w-4" />}>
              Create Listing
            </Button>
          </Link>
        }
      />

      {/* Filter tabs */}
      {!loading && !error && (data ?? []).length > 0 && (
        <div className="flex gap-1 overflow-x-auto border-b border-ink-200 pb-0">
          {FILTER_TABS.map((t) => {
            const count = t.key === 'all' ? (data?.length ?? 0) : (tabCounts[t.key] ?? 0);
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  'flex shrink-0 items-center gap-1.5 border-b-2 px-3 pb-3 pt-1 text-sm font-medium transition-colors',
                  tab === t.key
                    ? 'border-brand-600 text-brand-700'
                    : 'border-transparent text-ink-500 hover:text-ink-800',
                )}
              >
                {t.label}
                {count > 0 && (
                  <span
                    className={cn(
                      'inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold',
                      tab === t.key
                        ? 'bg-brand-100 text-brand-700'
                        : 'bg-ink-100 text-ink-500',
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
        <LoadingState label="Loading listings..." />
      ) : error ? (
        <ErrorState message={error.message} onRetry={reload} />
      ) : !data?.length ? (
        <EmptyState
          icon={<IconHome />}
          title="No listings yet"
          description="Listings are created from units. Open a property, add a unit, then publish it."
          action={
            <Link to="/app/properties">
              <Button>Go to Properties</Button>
            </Link>
          }
        />
      ) : filtered.length === 0 ? (
        <Card>
          <CardBody>
            <p className="py-8 text-center text-sm text-ink-500">
              No listings with status "{humanize(tab)}".
            </p>
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((listing) => {
            const isBusy = busyId === listing.id;
            const canSubmit = listing.status === 'draft';
            const canDelete = listing.status === 'draft' || listing.status === 'rejected';
            const isPending = listing.status === 'pending_review';
            const isRejected = listing.status === 'rejected';
            const isActive = listing.status === 'active';

            return (
              <Card key={listing.id} className="flex flex-col">
                <CardBody className="flex flex-1 flex-col gap-3">
                  {/* Status + featured */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge tone={listingStatusTone(listing.status)}>
                      {humanize(listing.status)}
                    </Badge>
                    {listing.featured && <Badge tone="brand">Featured</Badge>}
                  </div>

                  {/* Title */}
                  <p className="line-clamp-2 text-sm font-semibold text-ink-900 leading-snug flex-1">
                    {listing.title}
                  </p>

                  {/* Property + unit + rent */}
                  <div className="text-xs text-ink-500 space-y-0.5">
                    {listing.unit && (
                      <p>
                        Unit {listing.unit.unit_number}
                        {listing.unit.internal_name ? ` · ${listing.unit.internal_name}` : ''}
                      </p>
                    )}
                    {listing.unit?.rent_amount && (
                      <p style={{ color: 'var(--color-money)' }} className="font-semibold">
                        {formatCedisDecimal(listing.unit.rent_amount)}/mo
                      </p>
                    )}
                    {isActive && (
                      <p className="flex items-center gap-1 text-ink-400">
                        <IconEye size={12} />
                        {listing.view_count} views
                      </p>
                    )}
                  </div>

                  {/* Rejection reason banner */}
                  {isRejected && listing.rejection_reason && (
                    <div className="flex gap-2 rounded-xl bg-danger-50 px-3 py-2 text-xs text-danger-700">
                      <IconAlertTriangle size={13} className="mt-0.5 shrink-0" />
                      <span className="line-clamp-3">{listing.rejection_reason}</span>
                    </div>
                  )}

                  {/* Pending note */}
                  {isPending && (
                    <p className="rounded-xl bg-warning-50 px-3 py-2 text-xs text-warning-700">
                      Awaiting admin review. No changes can be made while under review.
                    </p>
                  )}

                  {/* Actions */}
                  <div className="mt-auto flex flex-wrap gap-2 border-t border-ink-100 pt-3">
                    {canSubmit && (
                      <Button
                        size="sm"
                        loading={isBusy && busyAction === 'submit'}
                        disabled={isBusy}
                        onClick={() => handleSubmit(listing)}
                      >
                        Submit for Review
                      </Button>
                    )}
                    {isRejected && (
                      <Button
                        variant="secondary"
                        size="sm"
                        leftIcon={<IconEdit size={13} />}
                        disabled={isBusy}
                      >
                        Edit & Resubmit
                      </Button>
                    )}
                    {isActive && (
                      <Button
                        variant="secondary"
                        size="sm"
                        leftIcon={<IconEye size={13} />}
                      >
                        View
                      </Button>
                    )}
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        loading={isBusy && busyAction === 'delete'}
                        disabled={isBusy}
                        onClick={() => handleDelete(listing)}
                      >
                        Delete
                      </Button>
                    )}
                    {isPending && (
                      <span className="text-xs italic text-ink-400 self-center">
                        Under review
                      </span>
                    )}
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
