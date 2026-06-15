import { useState } from 'react';
import { Link } from 'react-router';
import { useApi } from '@/hooks/useApi';
import { tenantApi } from '@/lib/endpoints';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { ListingCard } from '@/components/listings/ListingCard';
import { IconHeart, IconSearch } from '@/components/ui/icons';

export function SavedListings() {
  const { toast } = useToast();
  const { data, loading, error, reload } = useApi(() => tenantApi.savedListings(), []);
  const [removingId, setRemovingId] = useState<number | null>(null);

  async function handleRemove(listingId: number) {
    setRemovingId(listingId);
    try {
      await tenantApi.unsaveListing(listingId);
      toast('Removed from saved listings', 'success');
      reload();
    } catch {
      toast('Could not remove listing', 'error');
    } finally {
      setRemovingId(null);
    }
  }

  const listings = data ?? [];

  return (
    <div>
      <PageHeader
        title="Saved listings"
        description="Rentals you’ve bookmarked for later."
      />

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error.message} onRetry={reload} />
      ) : listings.length === 0 ? (
        <EmptyState
          icon={<IconHeart />}
          title="No saved listings yet"
          description="Browse available rentals and save the ones you like to find them here."
          action={
            <Link to="/app/browse">
              <Button leftIcon={<IconSearch className="h-4 w-4" />}>Browse listings</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              to={'/app/listing/' + listing.id}
              footer={
                <Button
                  variant="ghost"
                  size="sm"
                  loading={removingId === listing.id}
                  onClick={() => handleRemove(listing.id)}
                >
                  Remove
                </Button>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
