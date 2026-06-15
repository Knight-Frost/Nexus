import { useState } from 'react';
import { useApi } from '@/hooks/useApi';
import { publicApi } from '@/lib/endpoints';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { ListingCard } from '@/components/listings/ListingCard';
import { IconChevronRight, IconSearch } from '@/components/ui/icons';

interface Filters {
  city: string;
  state: string;
  min_price: string;
  max_price: string;
  bedrooms: string;
}

const EMPTY_FILTERS: Filters = {
  city: '',
  state: '',
  min_price: '',
  max_price: '',
  bedrooms: '',
};

/** Translate the string-based form state into the typed API params. */
function toParams(filters: Filters, page: number) {
  return {
    city: filters.city.trim() || undefined,
    state: filters.state.trim() || undefined,
    min_price: filters.min_price ? Number(filters.min_price) : undefined,
    max_price: filters.max_price ? Number(filters.max_price) : undefined,
    bedrooms: filters.bedrooms ? Number(filters.bedrooms) : undefined,
    page,
  };
}

export function BrowseListings() {
  // `draft` is what the form edits; `applied` is what we actually query on.
  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);

  const { data, loading, error, reload } = useApi(
    () => publicApi.listings(toParams(applied, page)),
    [applied, page],
  );

  function set<K extends keyof Filters>(key: K, value: string) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setApplied(draft);
  }

  function handleReset() {
    setDraft(EMPTY_FILTERS);
    setApplied(EMPTY_FILTERS);
    setPage(1);
  }

  const listings = data?.data ?? [];
  const currentPage = data?.current_page ?? 1;
  const lastPage = data?.last_page ?? 1;

  return (
    <div>
      <PageHeader
        title="Browse listings"
        description="Find your next home across available rentals."
      />

      <Card className="mb-6">
        <CardBody>
          <form
            onSubmit={handleSubmit}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            <Field label="City">
              {(id) => (
                <Input
                  id={id}
                  value={draft.city}
                  onChange={(e) => set('city', e.target.value)}
                  placeholder="Charlotte"
                />
              )}
            </Field>
            <Field label="State">
              {(id) => (
                <Input
                  id={id}
                  value={draft.state}
                  onChange={(e) => set('state', e.target.value)}
                  placeholder="NC"
                />
              )}
            </Field>
            <Field label="Bedrooms">
              {(id) => (
                <Input
                  id={id}
                  type="number"
                  min={0}
                  value={draft.bedrooms}
                  onChange={(e) => set('bedrooms', e.target.value)}
                  placeholder="Any"
                />
              )}
            </Field>
            <Field label="Min price">
              {(id) => (
                <Input
                  id={id}
                  type="number"
                  min={0}
                  value={draft.min_price}
                  onChange={(e) => set('min_price', e.target.value)}
                  placeholder="0"
                />
              )}
            </Field>
            <Field label="Max price">
              {(id) => (
                <Input
                  id={id}
                  type="number"
                  min={0}
                  value={draft.max_price}
                  onChange={(e) => set('max_price', e.target.value)}
                  placeholder="No max"
                />
              )}
            </Field>
            <div className="flex items-end gap-2">
              <Button
                type="submit"
                leftIcon={<IconSearch className="h-4 w-4" />}
                className="flex-1"
              >
                Search
              </Button>
              <Button type="button" variant="secondary" onClick={handleReset}>
                Reset
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error.message} onRetry={reload} />
      ) : listings.length === 0 ? (
        <EmptyState
          icon={<IconSearch />}
          title="No listings found"
          description="Try widening your search by removing some filters."
          action={
            <Button variant="secondary" onClick={handleReset}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                to={'/app/listing/' + listing.id}
              />
            ))}
          </div>

          {lastPage > 1 && (
            <div className="mt-8 flex items-center justify-center gap-4">
              <Button
                variant="secondary"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <span className="text-sm text-ink-500">
                Page {currentPage} of {lastPage}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={currentPage >= lastPage}
                onClick={() => setPage((p) => p + 1)}
                leftIcon={<IconChevronRight className="h-4 w-4" />}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
