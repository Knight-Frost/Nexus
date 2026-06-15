import { useState } from 'react';
import { Link } from 'react-router';
import { useApi } from '@/hooks/useApi';
import { landlordApi } from '@/lib/endpoints';
import type { ApiError, Listing } from '@/lib/types';
import { humanize, listingStatusTone } from '@/lib/format';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Table, THead, TH, TBody, TR, TD } from '@/components/ui/Table';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { IconHome } from '@/components/ui/icons';
import { useToast } from '@/components/ui/toast';

export function LandlordListings() {
  const { toast } = useToast();
  const { data, loading, error, reload } = useApi(() => landlordApi.listings(), []);

  // Track the listing id currently mutating, plus which action, to scope spinners.
  const [busyId, setBusyId] = useState<number | null>(null);
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

  return (
    <div>
      <PageHeader
        title="Listings"
        description="Publish and track the rental listings across your units."
      />

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error.message} onRetry={reload} />
      ) : !data?.length ? (
        <EmptyState
          icon={<IconHome />}
          title="No listings yet"
          description="Listings are created from a unit. Open a property, add a unit, then publish it."
          action={
            <Link to="/app/properties">
              <Button>Go to properties</Button>
            </Link>
          }
        />
      ) : (
        <Card>
          <Table>
            <THead>
              <TH>Title</TH>
              <TH>Status</TH>
              <TH>Views</TH>
              <TH>Featured</TH>
              <TH className="text-right">Actions</TH>
            </THead>
            <TBody>
              {data.map((listing) => {
                const isBusy = busyId === listing.id;
                const canSubmit = listing.status === 'draft';
                const canDelete = listing.status === 'draft' || listing.status === 'rejected';
                return (
                  <TR key={listing.id}>
                    <TD className="font-medium text-ink-900">{listing.title}</TD>
                    <TD>
                      <Badge tone={listingStatusTone(listing.status)}>
                        {humanize(listing.status)}
                      </Badge>
                    </TD>
                    <TD>{listing.view_count}</TD>
                    <TD>
                      {listing.featured ? <Badge tone="brand">Featured</Badge> : '—'}
                    </TD>
                    <TD className="text-right">
                      <div className="flex justify-end gap-1.5">
                        {canSubmit && (
                          <Button
                            variant="secondary"
                            size="sm"
                            loading={isBusy && busyAction === 'submit'}
                            disabled={isBusy}
                            onClick={() => handleSubmit(listing)}
                          >
                            Submit for review
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
                        {!canSubmit && !canDelete && (
                          <span className="text-sm text-ink-400">—</span>
                        )}
                      </div>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
