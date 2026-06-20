import { useState } from 'react';
import { Link } from 'react-router';
import { useApi } from '@/hooks/useApi';
import { tenantApi } from '@/lib/endpoints';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { ListingCard } from '@/components/listings/ListingCard';
import {
  IconHeart,
  IconSearch,
  IconX,
  IconTrash,
} from '@/components/ui/icons';
import type { Listing } from '@/lib/types';

/* ---- Remove button ------------------------------------------------------- */
function RemoveButton({
  listingId,
  removing,
  onRemove,
}: {
  listingId: number;
  removing: boolean;
  onRemove: (id: number) => void;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      loading={removing}
      onClick={() => onRemove(listingId)}
      leftIcon={removing ? undefined : <IconX size={14} />}
      className="text-ink-400 hover:text-danger-600"
    >
      Remove
    </Button>
  );
}

/* ---- Page ---------------------------------------------------------------- */
export function SavedListings() {
  const { data, loading, error, reload } = useApi(() => tenantApi.savedListings(), []);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [optimisticRemoved, setOptimisticRemoved] = useState<Set<number>>(new Set());

  async function handleRemove(listingId: number) {
    setRemovingId(listingId);
    // Optimistic update
    setOptimisticRemoved((prev) => new Set([...prev, listingId]));
    try {
      await tenantApi.unsaveListing(listingId);
      reload();
    } catch {
      // Rollback optimistic update on failure
      setOptimisticRemoved((prev) => {
        const next = new Set(prev);
        next.delete(listingId);
        return next;
      });
    } finally {
      setRemovingId(null);
    }
  }

  const allListings: Listing[] = data ?? [];
  const listings = allListings.filter((l) => !optimisticRemoved.has(l.id));

  return (
    <div className="animate-rise space-y-6">
      <PageHeader
        eyebrow="Find a Home"
        title="Saved Homes"
        description="Rentals you've bookmarked — compare and revisit anytime."
        action={
          listings.length > 0 ? (
            <Link to="/app/browse">
              <Button variant="secondary" size="sm" leftIcon={<IconSearch size={15} />}>
                Browse more
              </Button>
            </Link>
          ) : undefined
        }
      />

      {loading ? (
        <LoadingState label="Loading your saved homes..." />
      ) : error ? (
        <ErrorState message={error.message} onRetry={reload} />
      ) : listings.length === 0 ? (
        <EmptyState
          icon={<IconHeart size={28} />}
          title="No saved homes yet"
          description="Browse admin-verified listings across Accra, East Legon, Labone, and more. Tap the heart on any listing to save it here."
          action={
            <Link to="/app/browse">
              <Button leftIcon={<IconSearch size={16} />}>Browse homes</Button>
            </Link>
          }
        />
      ) : (
        <>
          <Card>
            <CardHeader
              title={`${listings.length} Saved Home${listings.length !== 1 ? 's' : ''}`}
              description="Tap any card to see full details, or remove listings you're no longer interested in."
              action={
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<IconTrash size={14} />}
                  className="text-danger-500 hover:text-danger-700 hover:bg-danger-50"
                  onClick={async () => {
                    // Clear all saved
                    const ids = listings.map((l) => l.id);
                    setOptimisticRemoved(new Set(ids));
                    await Promise.allSettled(ids.map((id) => tenantApi.unsaveListing(id)));
                    reload();
                  }}
                >
                  Clear all
                </Button>
              }
            />
            <CardBody className="pt-2 pb-2">
              <p className="text-xs text-ink-400">
                Use the{' '}
                <Link to="/app/compare" className="text-brand-700 hover:underline">
                  Compare
                </Link>{' '}
                tool to view listings side by side.
              </p>
            </CardBody>
          </Card>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                to={'/app/listing/' + listing.id}
                footer={
                  <RemoveButton
                    listingId={listing.id}
                    removing={removingId === listing.id}
                    onRemove={handleRemove}
                  />
                }
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
